import { Note } from '@tonaljs/tonal';

/**
 * 계이름(Solfege) 서비스
 * 음표를 도레미파솔라시도로 변환
 */
class SolfegeService {
  constructor() {
    // 계이름 매핑 (C = 도, 고정도법)
    this.solfegeMap = {
      'C': '도',
      'C#': '도#',
      'Db': '레♭',
      'D': '레',
      'D#': '레#',
      'Eb': '미♭',
      'E': '미',
      'F': '파',
      'F#': '파#',
      'Gb': '솔♭',
      'G': '솔',
      'G#': '솔#',
      'Ab': '라♭',
      'A': '라',
      'A#': '라#',
      'Bb': '시♭',
      'B': '시'
    };

    // 이동도법 매핑 (조에 따라 도의 위치가 달라짐)
    this.movableDoMap = {
      'C': { 'C': '도', 'D': '레', 'E': '미', 'F': '파', 'G': '솔', 'A': '라', 'B': '시' },
      'C#': { 'C#': '도', 'D#': '레', 'E#': '미', 'F#': '파', 'G#': '솔', 'A#': '라', 'B#': '시' },
      'D': { 'D': '도', 'E': '레', 'F#': '미', 'G': '파', 'A': '솔', 'B': '라', 'C#': '시' },
      'D#': { 'D#': '도', 'E#': '레', 'F##': '미', 'G#': '파', 'A#': '솔', 'B#': '라', 'C##': '시' },
      'E': { 'E': '도', 'F#': '레', 'G#': '미', 'A': '파', 'B': '솔', 'C#': '라', 'D#': '시' },
      'F': { 'F': '도', 'G': '레', 'A': '미', 'Bb': '파', 'C': '솔', 'D': '라', 'E': '시' },
      'F#': { 'F#': '도', 'G#': '레', 'A#': '미', 'B': '파', 'C#': '솔', 'D#': '라', 'E#': '시' },
      'G': { 'G': '도', 'A': '레', 'B': '미', 'C': '파', 'D': '솔', 'E': '라', 'F#': '시' },
      'G#': { 'G#': '도', 'A#': '레', 'B#': '미', 'C#': '파', 'D#': '솔', 'E#': '라', 'F##': '시' },
      'A': { 'A': '도', 'B': '레', 'C#': '미', 'D': '파', 'E': '솔', 'F#': '라', 'G#': '시' },
      'A#': { 'A#': '도', 'B#': '레', 'C##': '미', 'D#': '파', 'E#': '솔', 'F##': '라', 'G##': '시' },
      'B': { 'B': '도', 'C#': '레', 'D#': '미', 'E': '파', 'F#': '솔', 'G#': '라', 'A#': '시' },
      'Bb': { 'Bb': '도', 'C': '레', 'D': '미', 'Eb': '파', 'F': '솔', 'G': '라', 'A': '시' },
      'Eb': { 'Eb': '도', 'F': '레', 'G': '미', 'Ab': '파', 'Bb': '솔', 'C': '라', 'D': '시' },
      'Ab': { 'Ab': '도', 'Bb': '레', 'C': '미', 'Db': '파', 'Eb': '솔', 'F': '라', 'G': '시' },
      'Db': { 'Db': '도', 'Eb': '레', 'F': '미', 'Gb': '파', 'Ab': '솔', 'Bb': '라', 'C': '시' },
      'Gb': { 'Gb': '도', 'Ab': '레', 'Bb': '미', 'Cb': '파', 'Db': '솔', 'Eb': '라', 'F': '시' }
    };
  }

  /**
   * 음표를 계이름으로 변환
   * @param {string} noteName - 음이름 (예: 'C4', 'F#5')
   * @param {string} key - 조 (예: 'C', 'G')
   * @param {boolean} useMovableDo - 이동도법 사용 여부
   * @returns {string} 계이름
   */
  getSolfege(noteName, key = 'C', useMovableDo = false) {
    try {
      // Tonal.js로 음이름 파싱
      const note = Note.get(noteName);
      if (!note.pc) {
        return '';
      }

      const pitchClass = note.pc; // 예: 'C', 'F#', 'Bb'

      if (useMovableDo && this.movableDoMap[key]) {
        // 이동도법: 조에 따라 도의 위치가 달라짐
        return this.movableDoMap[key][pitchClass] || this.solfegeMap[pitchClass] || '';
      } else {
        // 고정도법: C = 도
        return this.solfegeMap[pitchClass] || '';
      }
    } catch (error) {
      console.error('계이름 변환 실패:', noteName, error);
      return '';
    }
  }

  /**
   * MusicXML에서 음표 정보 추출하여 계이름 배열 생성
   * @param {string} xmlString - MusicXML 문자열
   * @param {string} key - 조
   * @param {boolean} useMovableDo - 이동도법 사용 여부
   * @returns {Array} 계이름 정보 배열
   */
  extractSolfegeFromXML(xmlString, key = 'C', useMovableDo = false) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      const solfegeData = [];
      const measures = xmlDoc.getElementsByTagName('measure');

      for (let i = 0; i < measures.length; i++) {
        const measure = measures[i];
        const measureNumber = measure.getAttribute('number');
        const notes = measure.getElementsByTagName('note');

        for (let j = 0; j < notes.length; j++) {
          const note = notes[j];

          // 쉼표는 건너뛰기
          if (note.getElementsByTagName('rest').length > 0) {
            continue;
          }

          const pitchElement = note.getElementsByTagName('pitch')[0];
          if (!pitchElement) continue;

          // 음정 정보 추출
          const step = pitchElement.getElementsByTagName('step')[0]?.textContent;
          const alter = pitchElement.getElementsByTagName('alter')[0]?.textContent || '0';
          const octave = pitchElement.getElementsByTagName('octave')[0]?.textContent;

          if (!step || !octave) continue;

          // 음이름 생성
          const accidental = this.alterToAccidental(parseInt(alter));
          const noteName = step + accidental + octave;

          // 계이름 생성
          const solfege = this.getSolfege(noteName, key, useMovableDo);

          solfegeData.push({
            measureNumber: parseInt(measureNumber),
            noteIndex: j,
            noteName,
            solfege,
            step,
            octave: parseInt(octave)
          });
        }
      }

      return solfegeData;
    } catch (error) {
      console.error('MusicXML 계이름 추출 실패:', error);
      return [];
    }
  }

  /**
   * alter 값을 임시표로 변환
   */
  alterToAccidental(alter) {
    if (alter > 0) return '#'.repeat(alter);
    if (alter < 0) return 'b'.repeat(Math.abs(alter));
    return '';
  }

  /**
   * 지원하는 모든 조 목록
   */
  getSupportedKeys() {
    return Object.keys(this.movableDoMap);
  }
}

// 싱글톤 인스턴스 export
export default new SolfegeService();
