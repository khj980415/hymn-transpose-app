<template>
  <div class="sheet-viewer">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>악보를 렌더링하고 있습니다...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <button class="btn-retry" @click="retryRender">다시 시도</button>
    </div>

    <div v-else class="sheet-container">
      <!-- 컨트롤 바 -->
      <div class="controls">
        <button
          class="control-btn"
          @click="zoomOut"
          :disabled="zoom <= 0.5"
          title="축소"
        >
          🔍−
        </button>
        <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
        <button
          class="control-btn"
          @click="zoomIn"
          :disabled="zoom >= 2.0"
          title="확대"
        >
          🔍+
        </button>
        <button class="control-btn" @click="resetZoom" title="원래 크기">
          ↻
        </button>
      </div>

      <!-- 악보 렌더링 영역 -->
      <div
        ref="osmdContainer"
        class="osmd-container"
        :style="{ transform: `scale(${zoom})` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import solfegeService from '../services/solfegeService.js';

const props = defineProps({
  musicXML: {
    type: String,
    required: true
  },
  showSolfege: {
    type: Boolean,
    default: false
  },
  currentKey: {
    type: String,
    default: 'C'
  }
});

const emit = defineEmits(['renderComplete', 'renderError']);

// 상태
const osmdContainer = ref(null);
const loading = ref(true);
const error = ref('');
const zoom = ref(1.0);
const solfegeData = ref([]);
const solfegeOverlays = ref([]);

let osmd = null;

// 컴포넌트 마운트 시
onMounted(async () => {
  await initializeOSMD();
});

// musicXML이 변경될 때
watch(
  () => props.musicXML,
  async (newXML) => {
    if (newXML && osmd) {
      await renderSheet(newXML);
    }
  }
);

// showSolfege가 변경될 때
watch(
  () => props.showSolfege,
  async (show) => {
    if (show) {
      await renderSolfegeOverlay();
    } else {
      clearSolfegeOverlay();
    }
  }
);

// currentKey가 변경될 때
watch(
  () => props.currentKey,
  async () => {
    if (props.showSolfege) {
      await renderSolfegeOverlay();
    }
  }
);

/**
 * OSMD 초기화
 */
async function initializeOSMD() {
  try {
    loading.value = true;
    error.value = '';

    await nextTick(); // DOM이 준비될 때까지 대기

    if (!osmdContainer.value) {
      throw new Error('악보 컨테이너를 찾을 수 없습니다.');
    }

    // OSMD 인스턴스 생성
    osmd = new OpenSheetMusicDisplay(osmdContainer.value, {
      autoResize: true,
      backend: 'svg',
      drawTitle: true,
      drawComposer: true,
      drawCredits: false,
      drawPartNames: true,
      drawFingerings: true,
      drawLyrics: true,
      coloringMode: 0, // 0 = XML 색상 사용
      defaultColorNotehead: '#000000',
      defaultColorStem: '#000000'
    });

    // MusicXML 로드 및 렌더링
    if (props.musicXML) {
      await renderSheet(props.musicXML);
    }
  } catch (err) {
    console.error('OSMD 초기화 실패:', err);
    error.value = err.message || '악보 뷰어를 초기화할 수 없습니다.';
    emit('renderError', err);
  } finally {
    loading.value = false;
  }
}

/**
 * 악보 렌더링
 */
async function renderSheet(xmlString) {
  if (!osmd) {
    console.error('OSMD가 초기화되지 않았습니다.');
    return;
  }

  try {
    loading.value = true;
    error.value = '';

    // 기존 오버레이 제거
    clearSolfegeOverlay();

    // 컨테이너 초기화
    if (osmdContainer.value) {
      osmdContainer.value.innerHTML = '';
    }

    // MusicXML 로드
    await osmd.load(xmlString);

    // 렌더링
    await osmd.render();

    console.log('악보 렌더링 완료');
    emit('renderComplete');

    // 계이름 표시가 활성화되어 있으면 오버레이 렌더링
    if (props.showSolfege) {
      await renderSolfegeOverlay();
    }
  } catch (err) {
    console.error('악보 렌더링 실패:', err);
    error.value = '악보를 표시할 수 없습니다. MusicXML 형식을 확인하세요.';
    emit('renderError', err);
  } finally {
    loading.value = false;
  }
}

/**
 * 재시도
 */
async function retryRender() {
  await renderSheet(props.musicXML);
}

/**
 * 줌 인
 */
function zoomIn() {
  if (zoom.value < 2.0) {
    zoom.value = Math.min(2.0, zoom.value + 0.1);
  }
}

/**
 * 줌 아웃
 */
function zoomOut() {
  if (zoom.value > 0.5) {
    zoom.value = Math.max(0.5, zoom.value - 0.1);
  }
}

/**
 * 줌 리셋
 */
function resetZoom() {
  zoom.value = 1.0;
}

/**
 * 계이름 오버레이 렌더링
 */
async function renderSolfegeOverlay() {
  if (!osmd || !props.musicXML) return;

  try {
    // 기존 오버레이 제거
    clearSolfegeOverlay();

    // MusicXML에서 계이름 데이터 추출
    solfegeData.value = solfegeService.extractSolfegeFromXML(
      props.musicXML,
      props.currentKey,
      false // 고정도법 사용 (true로 변경하면 이동도법)
    );

    console.log('계이름 데이터:', solfegeData.value);

    // OSMD SVG에서 음표 위치 찾기
    await nextTick();

    const svgElement = osmdContainer.value?.querySelector('svg');
    if (!svgElement) {
      console.error('SVG 요소를 찾을 수 없습니다.');
      return;
    }

    // 모든 음표 요소 찾기
    const noteHeads = svgElement.querySelectorAll('.vf-notehead');

    let noteIndex = 0;
    noteHeads.forEach((noteHead) => {
      if (noteIndex >= solfegeData.value.length) return;

      const solfegeInfo = solfegeData.value[noteIndex];

      // 음표 위치 계산
      const bbox = noteHead.getBBox();
      const transform = noteHead.getCTM();

      if (!transform) return;

      const x = transform.e + bbox.x + bbox.width / 2;
      const y = transform.f + bbox.y - 10; // 음표 위 10px

      // 계이름 텍스트 요소 생성
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.setAttribute('x', x);
      textElement.setAttribute('y', y);
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('font-family', 'Arial, sans-serif');
      textElement.setAttribute('font-size', '12');
      textElement.setAttribute('font-weight', 'bold');
      textElement.setAttribute('fill', '#e53e3e'); // 빨간색
      textElement.setAttribute('class', 'solfege-label');
      textElement.textContent = solfegeInfo.solfege;

      svgElement.appendChild(textElement);
      solfegeOverlays.value.push(textElement);

      noteIndex++;
    });

    console.log(`계이름 ${solfegeOverlays.value.length}개 표시됨`);
  } catch (error) {
    console.error('계이름 오버레이 렌더링 실패:', error);
  }
}

/**
 * 계이름 오버레이 제거
 */
function clearSolfegeOverlay() {
  solfegeOverlays.value.forEach((element) => {
    element.remove();
  });
  solfegeOverlays.value = [];
}

/**
 * OSMD 인스턴스 반환 (외부에서 접근용)
 */
function getOSMD() {
  return osmd;
}

// 외부에서 접근 가능하도록 expose
defineExpose({
  getOSMD,
  renderSheet
});
</script>

<style scoped>
.sheet-viewer {
  width: 100%;
  min-height: 500px;
  background: #f7fafc;
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
}

/* 로딩 상태 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 에러 상태 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
}

.error-icon {
  font-size: 3rem;
}

.error-message {
  color: #e53e3e;
  font-size: 1rem;
  text-align: center;
  max-width: 400px;
}

.btn-retry {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-retry:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

/* 악보 컨테이너 */
.sheet-container {
  width: 100%;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.control-btn {
  padding: 0.5rem 0.75rem;
  background: #edf2f7;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.control-btn:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-level {
  font-size: 0.9rem;
  color: #4a5568;
  font-weight: 500;
  min-width: 50px;
  text-align: center;
}

/* OSMD 컨테이너 */
.osmd-container {
  width: 100%;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: auto;
  max-height: 600px;
  transform-origin: top left;
  transition: transform 0.2s;
}

/* 스크롤바 스타일링 */
.osmd-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.osmd-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.osmd-container::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.osmd-container::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* OSMD SVG 스타일 오버라이드 */
.osmd-container :deep(svg) {
  max-width: 100%;
  height: auto;
}

/* 계이름 라벨 스타일 */
.osmd-container :deep(.solfege-label) {
  pointer-events: none;
  user-select: none;
  text-shadow: 1px 1px 2px white, -1px -1px 2px white, 1px -1px 2px white, -1px 1px 2px white;
}
</style>
