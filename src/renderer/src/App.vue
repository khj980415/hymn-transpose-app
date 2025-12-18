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
          <h2 class="card-title">🎼 악보</h2>
          <div class="sheet-viewer">
            <div class="sheet-placeholder">
              악보가 여기에 표시됩니다
            </div>
          </div>
        </div>

        <!-- 컨트롤 패널 -->
        <div class="card control-card">
          <h3 class="control-title">🎹 전조 및 설정</h3>

          <div class="control-group">
            <label class="control-label">원본 조</label>
            <select class="control-select" v-model="originalKey">
              <option v-for="key in keys" :key="key" :value="key">{{ key }}</option>
            </select>
          </div>

          <div class="control-group">
            <label class="control-label">변환할 조</label>
            <select class="control-select" v-model="targetKey">
              <option v-for="key in keys" :key="key" :value="key">{{ key }}</option>
            </select>
          </div>

          <div class="control-group">
            <label class="control-label">
              <input type="checkbox" v-model="showSolfege" />
              계이름 표시
            </label>
          </div>

          <button class="btn-primary" @click="applyTranspose">
            전조 적용
          </button>

          <button class="btn-secondary" @click="resetAll">
            처음으로
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ImageUploader from './components/ImageUploader.vue';

// 상태 관리
const currentStep = ref(0);
const steps = ['이미지 업로드', '변환 중', '악보 보기'];

const uploaderRef = ref(null);
const uploadedFile = ref(null);
const imageMetadata = ref(null);

// 로딩
const loadingMessage = ref('이미지를 분석하고 있습니다...');
const progress = ref(0);

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

// 변환 시작 (더미)
function startConversion(file) {
  console.log('변환 시작:', file.name);
  currentStep.value = 1;

  // 더미 로딩 시뮬레이션
  let currentProgress = 0;
  const messages = [
    '이미지를 분석하고 있습니다...',
    '악보를 인식하고 있습니다...',
    'MusicXML로 변환 중...',
    '거의 완료되었습니다...'
  ];

  const interval = setInterval(() => {
    currentProgress += 5;
    progress.value = currentProgress;

    if (currentProgress % 25 === 0) {
      const msgIndex = Math.floor(currentProgress / 25) - 1;
      if (msgIndex >= 0 && msgIndex < messages.length) {
        loadingMessage.value = messages[msgIndex];
      }
    }

    if (currentProgress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        currentStep.value = 2;
      }, 500);
    }
  }, 100);
}

// 전조 적용 (더미)
function applyTranspose() {
  console.log(`전조: ${originalKey.value} → ${targetKey.value}`);
  console.log(`계이름 표시: ${showSolfege.value}`);
  alert(`${originalKey.value}에서 ${targetKey.value}로 전조합니다!`);
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
  padding: 2rem;
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
  max-width: 900px;
  margin: 0 auto;
}

/* 카드 공통 */
.card {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.card-title {
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  color: #2d3748;
}

/* 업로드 카드 (이제 ImageUploader 컴포넌트가 처리) */

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
  grid-template-columns: 2fr 1fr;
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

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
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
