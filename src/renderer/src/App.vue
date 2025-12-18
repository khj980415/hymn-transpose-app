<script setup>
const ipcHandle = () => window.electron.ipcRenderer.send('ping')
</script>

<template>
  <div class="wrapper">
    <header>
      <h1>🎵 악보 전조 도우미</h1>
      <p>악보를 업로드하고 원하는 키로 전조해보세요</p>
    </header>
    <section class="upload">
      <form>
        <input type="file" name="sheet" id="sheet" accept="image/*">

        <button>변환하기</button>
      </form>
    </section>
  </div>
</template>
