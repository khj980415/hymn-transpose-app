<template>
  <div id="app">
    <!-- 헤더 -->
    <header class="app-header">
      <h1 class="app-title">🎵 찬송가 전조 도우미</h1>
      <p class="app-subtitle">악보 이미지를 업로드하고 원하는 조로 전조하세요</p>
    </header>

    <!-- 진행 단계 표시 -->
    <div class="progress-steps">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="step"
        :class="{ active: currentStep === index, completed: currentStep > index }"
      >
        <div class="step-number">{{ index + 1 }}</div>
        <div class="step-label">{{ step }}</div>
      </div>
    </div>

    <!-- 메인 컨텐츠 -->
    <main class="main-content">
      <!-- STEP 1: 이미지 업로드 -->
      <div v-if="currentStep === 0" class="card upload-card">
        <h2 class="card-title">📸 악보 이미지 업로드</h2>
        <ImageUploader
          ref="uploaderRef"
          @fileSelected="handleFileSelected"
          @convert="startConversion"
        />
      </div>

      <!-- STEP 2: 변환 중 -->
      <div v-if="currentStep === 1" class="card loading-card">
        <h2 class="card-title">⚙️ 악보 변환 중...</h2>
        <div class="loading-content">
          <div class="spinner"></div>
          <p class="loading-text">{{ loadingMessage }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="progress-percent">{{ progress }}%</p>
        </div>
      </div>

      <!-- STEP 3: 악보 보기 및 전조 -->
      <div v-if="currentStep === 2" class="result-container">
        <!-- 악보 뷰어 -->
        <div class="card sheet-card">
          <div class="sheet-header">
            <div>
              <h2 class="card-title">🎼 {{ parsedMusicData?.title || '악보' }}</h2>
              <p v-if="parsedMusicData?.composer" class="composer">
                작곡: {{ parsedMusicData.composer }}
              </p>
            </div>
          </div>

          <SheetViewer
            ref="sheetViewerRef"
            :musicXML="isTransposed ? transposedMusicXML : musicXML"
            :showSolfege="showSolfege"
            :currentKey="isTransposed ? targetKey : originalKey"
            @renderComplete="handleRenderComplete"
            @renderError="handleRenderError"
          />
        </div>

        <!-- 컨트롤 패널 -->
        <div class="card control-card">
          <h3 class="control-title">🎹 전조 및 설정</h3>

          <div class="control-group">
            <label class="control-label">원본 조</label>
            <select class="control-select" v-model="originalKey" :disabled="isTransposed">
              <option v-for="key in keys" :key="key" :value="key">{{ key }}</option>
            </select>
          </div>

          <div class="control-group">
            <label class="control-label">변환할 조</label>
            <select class="control-select" v-model="targetKey">
              <option v-for="key in keys" :key="key" :value="key">{{ key }}</option>
            </select>
          </div>

          <!-- 전조 상태 표시 -->
          <div v-if="isTransposed" class="transposition-info">
            ✓ {{ originalKey }} → {{ targetKey }}로 전조됨
          </div>

          <div class="control-group">
            <label class="control-label checkbox-label">
              <input type="checkbox" v-model="showSolfege" />
              <span>계이름 표시</span>
            </label>
          </div>

          <button
            class="btn-primary"
            @click="applyTranspose"
            :disabled="originalKey === targetKey && !isTransposed"
          >
            전조 적용
          </button>

          <!-- 원본 복원 버튼 -->
          <button v-if="isTransposed" class="btn-secondary" @click="restoreOriginal">
            원본 복원
          </button>

          <button class="btn-secondary" @click="exportPDF">PDF로 저장</button>

          <button class="btn-secondary" @click="resetAll">처음으로</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ImageUploader from './components/ImageUploader.vue';
import SheetViewer from './components/SheetViewer.vue';
import omrService from './services/omrService.js';
import xmlParser from './services/xmlParser.js';
import transposeService from './services/transposeService.js';

// 상태 관리
const currentStep = ref(0);
const steps = ['이미지 업로드', '변환 중', '악보 보기'];

const uploaderRef = ref(null);
const sheetViewerRef = ref(null);
const uploadedFile = ref(null);
const imageMetadata = ref(null);

// 로딩
const loadingMessage = ref('이미지를 분석하고 있습니다...');
const progress = ref(0);

// MusicXML 관련 상태
const musicXML = ref('');
const parsedMusicData = ref(null);
const conversionError = ref('');

// 전조 관련 상태
const transposedMusicXML = ref('');
const isTransposed = ref(false);

// 전조 컨트롤
const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const originalKey = ref('C');
const targetKey = ref('C');
const showSolfege = ref(false);

// 파일 선택 이벤트
function handleFileSelected(data) {
  uploadedFile.value = data.file;
  imageMetadata.value = {
    width: data.width,
    height: data.height,
    preview: data.preview
  };
  console.log('파일 선택됨:', data);
}

// 변환 시작
async function startConversion(file) {
  console.log('변환 시작:', file.name);
  currentStep.value = 1;
  progress.value = 0;
  conversionError.value = '';

  try {
    // 1단계: 이미지 → MusicXML
    loadingMessage.value = '이미지를 분석하고 있습니다...';
    progress.value = 25;

    const xmlString = await omrService.convertToMusicXML(file);
    musicXML.value = xmlString;

    // 2단계: MusicXML 파싱
    loadingMessage.value = '악보 데이터를 처리하고 있습니다...';
    progress.value = 75;

    const parsedData = await xmlParser.parse(xmlString);
    parsedMusicData.value = parsedData;

    console.log('변환 완료:', parsedData);

    // 자동으로 조성 감지
    const keyInfo = xmlParser.extractKeySignature(parsedData);
    originalKey.value = fifthsToKey(keyInfo.fifths);

    // 3단계: 완료
    loadingMessage.value = '완료되었습니다!';
    progress.value = 100;

    setTimeout(() => {
      currentStep.value = 2;
    }, 500);
  } catch (error) {
    console.error('변환 실패:', error);
    conversionError.value = error.message || '변환 중 오류가 발생했습니다.';

    // 에러 발생 시 STEP 1로 돌아가기
    setTimeout(() => {
      currentStep.value = 0;
      alert('변환 실패: ' + conversionError.value);
    }, 1000);
  }
}

// Fifths 값을 조 이름으로 변환
function fifthsToKey(fifths) {
  const keyMap = {
    '-7': 'Cb',
    '-6': 'Gb',
    '-5': 'Db',
    '-4': 'Ab',
    '-3': 'Eb',
    '-2': 'Bb',
    '-1': 'F',
    '0': 'C',
    '1': 'G',
    '2': 'D',
    '3': 'A',
    '4': 'E',
    '5': 'B',
    '6': 'F#',
    '7': 'C#'
  };
  return keyMap[fifths.toString()] || 'C';
}

// 전조 적용
async function applyTranspose() {
  if (originalKey.value === targetKey.value && !isTransposed.value) {
    alert('원본 조와 목표 조가 같습니다.');
    return;
  }

  try {
    console.log(`전조 적용: ${originalKey.value} → ${targetKey.value}`);

    // 원본 XML 또는 이미 전조된 XML 사용
    const sourceXML = isTransposed.value ? transposedMusicXML.value : musicXML.value;
    const currentKey = isTransposed.value ? targetKey.value : originalKey.value;

    // 전조 수행
    const newXML = transposeService.transpose(sourceXML, currentKey, targetKey.value);

    // 전조된 XML 저장
    transposedMusicXML.value = newXML;
    isTransposed.value = true;

    // 악보 재렌더링
    if (sheetViewerRef.value) {
      await sheetViewerRef.value.renderSheet(newXML);
    }

    console.log('전조 완료!');
  } catch (error) {
    console.error('전조 실패:', error);
    alert('전조에 실패했습니다: ' + error.message);
  }
}

// 렌더링 완료 핸들러
function handleRenderComplete() {
  console.log('악보 렌더링 완료');
}

// 렌더링 에러 핸들러
function handleRenderError(error) {
  console.error('악보 렌더링 에러:', error);
  alert('악보를 표시할 수 없습니다: ' + error.message);
}

// PDF 내보내기 (더미)
function exportPDF() {
  alert('PDF 내보내기 기능은 Phase 9에서 구현됩니다.');
}

// 원본 악보로 복원
async function restoreOriginal() {
  try {
    isTransposed.value = false;
    targetKey.value = originalKey.value;

    if (sheetViewerRef.value) {
      await sheetViewerRef.value.renderSheet(musicXML.value);
    }

    console.log('원본 악보로 복원됨');
  } catch (error) {
    console.error('복원 실패:', error);
    alert('원본 복원에 실패했습니다.');
  }
}

// 초기화
function resetAll() {
  currentStep.value = 0;
  uploadedFile.value = null;
  imageMetadata.value = null;
  progress.value = 0;
  originalKey.value = 'C';
  targetKey.value = 'C';
  showSolfege.value = false;
  musicXML.value = '';
  parsedMusicData.value = null;
  conversionError.value = '';
  transposedMusicXML.value = '';
  isTransposed.value = false;

  // ImageUploader 컴포넌트 리셋
  if (uploaderRef.value) {
    uploaderRef.value.reset();
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0.75rem 0.5rem;
}

/* 헤더 */
.app-header {
  text-align: center;
  color: white;
  margin-bottom: 3rem;
}

.app-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.app-subtitle {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
}

/* 진행 단계 */
.progress-steps {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.step.active,
.step.completed {
  opacity: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.2rem;
}

.step.active .step-number {
  background: white;
  color: #667eea;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.step.completed .step-number {
  background: #48bb78;
}

.step-label {
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
}

/* 메인 컨텐츠 */
.main-content {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 카드 공통 */
.card {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.card-title {
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  color: #2d3748;
}

/* 업로드 카드 (이제 ImageUploader 컴포넌트가 처리) */

/* 악보 정보 */
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.composer {
  margin: 0.5rem 0 0 0;
  color: #718096;
  font-size: 0.95rem;
}

/* 로딩 카드 */
.loading-content {
  text-align: center;
  padding: 2rem;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 2rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 1.1rem;
  color: #4a5568;
  margin-bottom: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s;
}

.progress-percent {
  font-size: 0.9rem;
  color: #718096;
}

/* 결과 컨테이너 */
.result-container {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 1.5rem;
}

.sheet-viewer {
  min-height: 400px;
  background: #f7fafc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-placeholder {
  color: #a0aec0;
  font-size: 1.1rem;
}

/* 컨트롤 패널 */
.control-title {
  font-size: 1.2rem;
  margin: 0 0 1.5rem 0;
  color: #2d3748;
}

.control-group {
  margin-bottom: 1.5rem;
}

.control-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #4a5568;
  font-weight: 500;
  font-size: 0.95rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.control-select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.control-select:focus {
  outline: none;
  border-color: #667eea;
}

.control-select:disabled {
  background: #f7fafc;
  cursor: not-allowed;
  opacity: 0.6;
}

.transposition-info {
  padding: 0.75rem;
  background: #e6fffa;
  border: 1px solid #81e6d9;
  border-radius: 6px;
  color: #234e52;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  margin-bottom: 1rem;
}

/* 버튼 */
.btn-primary,
.btn-secondary {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #edf2f7;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

/* 반응형 */
@media (max-width: 768px) {
  .result-container {
    grid-template-columns: 1fr;
  }

  .progress-steps {
    gap: 1rem;
  }

  .app-title {
    font-size: 2rem;
  }
}
</style>
