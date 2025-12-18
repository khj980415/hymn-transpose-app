import { Note, Interval, Key } from '@tonaljs/tonal';

/**
 * 전조 서비스
 * MusicXML의 음정을 다른 조로 변환
 */
class TransposeService {
  /**
   * MusicXML을 전조
   * @param {string} xmlString - 원본 MusicXML
   * @param {string} fromKey - 원본 조 (예: 'C', 'D', 'F#')
   * @param {string} toKey - 목표 조
   * @returns {string} 전조된 MusicXML
   */
  transpose(xmlString, fromKey, toKey) {
    if (fromKey === toKey) {
      return xmlString; // 같은 조면 변환 불필요
    }

    try {
      // 반음 간격 계산
      const semitones = this.calculateSemitones(fromKey, toKey);
      console.log(`전조: ${fromKey} → ${toKey} (${semitones}반음)`);

      // XML 파싱 및 변환
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      // 조성 정보 업데이트
      this.updateKeySignature(xmlDoc, toKey);

      // 모든 음표 전조
      this.transposeAllNotes(xmlDoc, semitones);

      // XML 문자열로 변환
      const serializer = new XMLSerializer();
      return serializer.serializeToString(xmlDoc);
    } catch (error) {
      console.error('전조 실패:', error);
      throw new Error('전조 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 두 조 사이의 반음 간격 계산
   * @param {string} fromKey - 시작 조
   * @param {string} toKey - 목표 조
   * @returns {number} 반음 수 (-11 ~ 11)
   */
  calculateSemitones(fromKey, toKey) {
    const fromNote = Note.get(fromKey + '4');
    const toNote = Note.get(toKey + '4');

    if (!fromNote.midi || !toNote.midi) {
      throw new Error('유효하지 않은 조 이름입니다.');
    }

    let semitones = toNote.midi - fromNote.midi;

    // -11 ~ 11 범위로 정규화
    while (semitones > 11) semitones -= 12;
    while (semitones < -11) semitones += 12;

    return semitones;
  }

  /**
   * 조성 정보(key signature) 업데이트
   * @param {Document} xmlDoc - XML Document
   * @param {string} toKey - 목표 조
   */
  updateKeySignature(xmlDoc, toKey) {
    const keyElements = xmlDoc.getElementsByTagName('key');

    for (let i = 0; i < keyElements.length; i++) {
      const keyElement = keyElements[i];
      const fifthsElement = keyElement.getElementsByTagName('fifths')[0];

      if (fifthsElement) {
        const fifths = this.keyToFifths(toKey);
        fifthsElement.textContent = fifths.toString();
      }
    }
  }

  /**
   * 조 이름을 fifths 값으로 변환
   * @param {string} keyName - 조 이름 (예: 'C', 'G', 'D#')
   * @returns {number} fifths 값 (-7 ~ 7)
   */
  keyToFifths(keyName) {
    const keyMap = {
      Cb: -7,
      Gb: -6,
      Db: -5,
      Ab: -4,
      Eb: -3,
      Bb: -2,
      F: -1,
      C: 0,
      G: 1,
      D: 2,
      A: 3,
      E: 4,
      B: 5,
      'F#': 6,
      'C#': 7
    };

    // 이명동음 처리 (예: D# → Eb)
    const enharmonics = {
      'A#': 'Bb',
      'D#': 'Eb',
      'G#': 'Ab'
    };

    const normalized = enharmonics[keyName] || keyName;
    return keyMap[normalized] || 0;
  }

  /**
   * 모든 음표 전조
   * @param {Document} xmlDoc - XML Document
   * @param {number} semitones - 이동할 반음 수
   */
  transposeAllNotes(xmlDoc, semitones) {
    const notes = xmlDoc.getElementsByTagName('note');

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];

      // 쉼표는 건너뛰기
      if (note.getElementsByTagName('rest').length > 0) {
        continue;
      }

      // pitch 요소 찾기
      const pitchElement = note.getElementsByTagName('pitch')[0];
      if (!pitchElement) continue;

      this.transposePitch(pitchElement, semitones);
    }
  }

  /**
   * 개별 음정 전조
   * @param {Element} pitchElement - pitch XML 요소
   * @param {number} semitones - 이동할 반음 수
   */
  transposePitch(pitchElement, semitones) {
    const stepElement = pitchElement.getElementsByTagName('step')[0];
    const alterElement = pitchElement.getElementsByTagName('alter')[0];
    const octaveElement = pitchElement.getElementsByTagName('octave')[0];

    if (!stepElement || !octaveElement) return;

    // 현재 음정 정보
    const step = stepElement.textContent;
    const alter = alterElement ? parseInt(alterElement.textContent) : 0;
    const octave = parseInt(octaveElement.textContent);

    // MIDI 번호로 변환
    const noteName = step + this.alterToAccidental(alter);
    const currentNote = Note.get(noteName + octave);

    if (!currentNote.midi) {
      console.warn('유효하지 않은 음표:', noteName + octave);
      return;
    }

    // 전조된 MIDI 번호
    const newMidi = currentNote.midi + semitones;
    const newNote = Note.fromMidi(newMidi);

    // 새 음정 정보 추출
    const newPitch = Note.pitchClass(newNote);
    const newOctave = Note.octave(newNote);

    // step과 alter 분리
    const { step: newStep, alter: newAlter } = this.parseNoteName(newPitch);

    // XML 업데이트
    stepElement.textContent = newStep;
    octaveElement.textContent = newOctave.toString();

    // alter 요소 처리
    if (newAlter !== 0) {
      if (alterElement) {
        alterElement.textContent = newAlter.toString();
      } else {
        // alter 요소 새로 생성
        const newAlterElement = pitchElement.ownerDocument.createElement('alter');
        newAlterElement.textContent = newAlter.toString();
        pitchElement.insertBefore(newAlterElement, octaveElement);
      }
    } else if (alterElement) {
      // alter=0이면 요소 제거
      pitchElement.removeChild(alterElement);
    }
  }

  /**
   * alter 값을 임시표 문자로 변환
   * @param {number} alter - alter 값
   * @returns {string} 임시표 ('', '#', 'b')
   */
  alterToAccidental(alter) {
    if (alter > 0) return '#'.repeat(alter);
    if (alter < 0) return 'b'.repeat(Math.abs(alter));
    return '';
  }

  /**
   * 음이름을 step과 alter로 분리
   * @param {string} noteName - 음이름 (예: 'C', 'F#', 'Bb')
   * @returns {Object} { step, alter }
   */
  parseNoteName(noteName) {
    const step = noteName.charAt(0).toUpperCase();
    const accidental = noteName.slice(1);

    let alter = 0;
    if (accidental.includes('#')) {
      alter = accidental.length;
    } else if (accidental.includes('b')) {
      alter = -accidental.length;
    }

    return { step, alter };
  }

  /**
   * 조 이름을 표준 형식으로 정규화
   * @param {string} keyName - 조 이름
   * @returns {string} 정규화된 조 이름
   */
  normalizeKeyName(keyName) {
    const enharmonics = {
      'A#': 'Bb',
      'D#': 'Eb',
      'G#': 'Ab',
      Cb: 'B',
      'E#': 'F',
      Fb: 'E',
      'B#': 'C'
    };

    return enharmonics[keyName] || keyName;
  }
}

// 싱글톤 인스턴스 export
export default new TransposeService();
