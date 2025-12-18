<template>
  <div class="image-uploader">
    <div
      class="upload-zone"
      :class="{ 'drag-over': isDragOver, 'has-image': previewUrl }"
      @click="triggerFileInput"
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileSelect"
        style="display: none;"
      />

      <!-- 업로드 전 -->
      <div v-if="!previewUrl" class="upload-placeholder">
        <div class="upload-icon">📁</div>
        <p class="upload-text">
          {{ isDragOver ? '이미지를 여기에 놓으세요' : '클릭하거나 이미지를 드래그하세요' }}
        </p>
        <p class="upload-hint">PNG, JPG 형식 지원 (최대 10MB)</p>
      </div>

      <!-- 업로드 후 미리보기 -->
      <div v-else class="preview-container">
        <img :src="previewUrl" alt="미리보기" class="preview-image" />
        <div class="image-info">
          <p class="info-item">
            <strong>파일명:</strong> {{ fileName }}
          </p>
          <p class="info-item">
            <strong>크기:</strong> {{ fileSize }}
          </p>
          <p class="info-item" v-if="imageDimensions">
            <strong>해상도:</strong> {{ imageDimensions }}
          </p>
        </div>
        <button class="btn-change" @click.stop="triggerFileInput">
          다른 이미지 선택
        </button>
      </div>
    </div>

    <!-- 에러 메시지 -->
    <div v-if="errorMessage" class="error-message">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- 변환 시작 버튼 -->
    <button
      v-if="previewUrl && !errorMessage"
      class="btn-primary btn-convert"
      @click="handleConvert"
      :disabled="isConverting"
    >
      {{ isConverting ? '변환 중...' : '변환 시작' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['fileSelected', 'convert']);

// 상태
const fileInput = ref(null);
const previewUrl = ref(null);
const uploadedFile = ref(null);
const isDragOver = ref(false);
const errorMessage = ref('');
const isConverting = ref(false);
const imageDimensions = ref('');

// 파일 정보
const fileName = computed(() => uploadedFile.value?.name || '');
const fileSize = computed(() => {
  if (!uploadedFile.value) return '';
  const bytes = uploadedFile.value.size;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
});

// 설정
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MIN_RESOLUTION = 300; // 최소 권장 DPI

// 파일 선택 트리거
function triggerFileInput() {
  if (!isConverting.value) {
    fileInput.value.click();
  }
}

// 파일 선택 핸들러
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    validateAndPreviewFile(file);
  }
}

// 드래그 앤 드롭 핸들러
function handleDrop(event) {
  isDragOver.value = false;
  const file = event.dataTransfer.files[0];
  if (file) {
    validateAndPreviewFile(file);
  }
}

// 파일 검증 및 미리보기
async function validateAndPreviewFile(file) {
  errorMessage.value = '';

  // 1. 파일 타입 검증
  if (!ALLOWED_TYPES.includes(file.type)) {
    errorMessage.value = 'PNG 또는 JPG 형식의 이미지만 업로드할 수 있습니다.';
    return;
  }

  // 2. 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = '파일 크기는 10MB 이하여야 합니다.';
    return;
  }

  // 3. 이미지 로드 및 해상도 확인
  try {
    const imageData = await loadImage(file);

    // 해상도 정보 저장
    imageDimensions.value = `${imageData.width} × ${imageData.height}px`;

    // 너무 작은 이미지 경고 (하지만 허용)
    if (imageData.width < MIN_RESOLUTION || imageData.height < MIN_RESOLUTION) {
      errorMessage.value = `경고: 이미지 해상도가 낮습니다 (${MIN_RESOLUTION}px 이상 권장). 변환 정확도가 낮을 수 있습니다.`;
    }

    // 파일 저장
    uploadedFile.value = file;
    previewUrl.value = imageData.url;

    // 부모 컴포넌트에 알림
    emit('fileSelected', {
      file,
      preview: imageData.url,
      width: imageData.width,
      height: imageData.height
    });

  } catch (error) {
    errorMessage.value = '이미지를 불러오는 중 오류가 발생했습니다.';
    console.error('Image load error:', error);
  }
}

// 이미지 로드 헬퍼
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.onload = () => {
        resolve({
          url: e.target.result,
          width: img.width,
          height: img.height
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 변환 시작
function handleConvert() {
  if (!uploadedFile.value || errorMessage.value) return;

  isConverting.value = true;
  emit('convert', uploadedFile.value);
}

// 리셋 (부모에서 호출)
function reset() {
  previewUrl.value = null;
  uploadedFile.value = null;
  errorMessage.value = '';
  isConverting.value = false;
  imageDimensions.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

// 외부에서 호출 가능하도록 expose
defineExpose({
  reset
});
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.upload-zone {
  border: 3px dashed #cbd5e0;
  border-radius: 12px;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
}

.upload-zone:hover:not(.has-image) {
  border-color: #667eea;
  background: #f7fafc;
}

.upload-zone.drag-over {
  border-color: #667eea;
  background: #edf2f7;
  transform: scale(1.02);
}

.upload-zone.has-image {
  cursor: default;
  padding: 2rem;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon {
  font-size: 4rem;
  transition: transform 0.3s;
}

.upload-zone:hover .upload-icon {
  transform: scale(1.1);
}

.upload-text {
  font-size: 1.2rem;
  color: #4a5568;
  margin: 0;
  font-weight: 500;
}

.upload-hint {
  font-size: 0.9rem;
  color: #a0aec0;
  margin: 0;
}

.preview-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-info {
  width: 100%;
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  text-align: left;
}

.info-item {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #4a5568;
}

.info-item strong {
  color: #2d3748;
}

.btn-change {
  padding: 0.75rem 1.5rem;
  background: #edf2f7;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
  color: #4a5568;
}

.btn-change:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff5f5;
  border: 1px solid #fc8181;
  border-radius: 8px;
  color: #c53030;
  font-size: 0.95rem;
}

.btn-convert {
  width: 100%;
  margin-top: 1.5rem;
}

.btn-primary {
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
