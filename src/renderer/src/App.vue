<script setup>
console.log('Vue app initialized - Phase 1');
</script>

<template>
  <div id="app">
    <h1>🎵 악보 전조 프로그램</h1>
    <p>Phase 1 완료 - 기본 구조 설정됨</p>
    <div class="info">
      <h2>프로젝트 정보</h2>
      <ul>
        <li>Electron + Vue 3 기반</li>
        <li>electron-vite 사용</li>
        <li>필수 라이브러리 설치 완료</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
#app {
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  text-align: center;
}

.info {
  margin-top: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.info ul {
  list-style: none;
  padding: 0;
}

.info li {
  margin: 0.5rem 0;
}
</style>
