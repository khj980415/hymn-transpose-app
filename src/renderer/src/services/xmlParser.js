import xml2js from 'xml2js';

/**
 * MusicXML 파서
 * MusicXML 문자열을 JavaScript 객체로 변환
 */
class XMLParser {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      explicitRoot: true
    });
  }

  /**
   * MusicXML 문자열을 파싱
   * @param {string} xmlString - MusicXML 문자열
   * @returns {Promise<Object>} 파싱된 객체
   */
  async parse(xmlString) {
    try {
      const result = await this.parser.parseStringPromise(xmlString);
      return this.normalizeParsedData(result);
    } catch (error) {
      console.error('XML 파싱 실패:', error);
      throw new Error('악보 데이터를 읽을 수 없습니다. XML 형식을 확인하세요.');
    }
  }

  /**
   * 파싱된 데이터 정규화
   * xml2js의 결과를 더 사용하기 쉽게 변환
   */
  normalizeParsedData(data) {
    const score = data['score-partwise'];

    if (!score) {
      throw new Error('유효하지 않은 MusicXML 형식입니다.');
    }

    return {
      title: this.extractTitle(score),
      composer: this.extractComposer(score),
      parts: this.extractParts(score),
      rawData: score
    };
  }

  /**
   * 제목 추출
   */
  extractTitle(score) {
    return score.work?.['work-title'] || '제목 없음';
  }

  /**
   * 작곡가 추출
   */
  extractComposer(score) {
    const identification = score.identification;
    if (!identification) return '작곡가 미상';

    const creator = identification.creator;
    if (!creator) return '작곡가 미상';

    // creator가 배열인 경우
    if (Array.isArray(creator)) {
      const composer = creator.find((c) => c.type === 'composer');
      return composer?.$t || composer?._ || '작곡가 미상';
    }

    // creator가 단일 객체인 경우
    return creator.$t || creator._ || creator || '작곡가 미상';
  }

  /**
   * 파트(성부) 추출
   */
  extractParts(score) {
    const parts = score.part;

    if (!parts) return [];

    // 배열이 아니면 배열로 변환
    const partArray = Array.isArray(parts) ? parts : [parts];

    return partArray.map((part, index) => ({
      id: part.id || `P${index + 1}`,
      name: this.getPartName(score, part.id) || `Part ${index + 1}`,
      measures: this.extractMeasures(part)
    }));
  }

  /**
   * 파트 이름 추출
   */
  getPartName(score, partId) {
    const partList = score['part-list'];
    if (!partList) return null;

    const scorePart = partList['score-part'];
    if (!scorePart) return null;

    // 배열인 경우
    if (Array.isArray(scorePart)) {
      const part = scorePart.find((p) => p.id === partId);
      return part?.['part-name'] || null;
    }

    // 단일 객체인 경우
    return scorePart.id === partId ? scorePart['part-name'] : null;
  }

  /**
   * 마디 추출
   */
  extractMeasures(part) {
    const measures = part.measure;
    if (!measures) return [];

    const measureArray = Array.isArray(measures) ? measures : [measures];

    return measureArray.map((measure) => ({
      number: parseInt(measure.number) || 0,
      attributes: measure.attributes,
      notes: this.extractNotes(measure),
      rawData: measure
    }));
  }

  /**
   * 음표 추출
   */
  extractNotes(measure) {
    const notes = measure.note;
    if (!notes) return [];

    const noteArray = Array.isArray(notes) ? notes : [notes];

    return noteArray.map((note) => ({
      pitch: note.pitch
        ? {
            step: note.pitch.step,
            alter: parseInt(note.pitch.alter) || 0,
            octave: parseInt(note.pitch.octave)
          }
        : null,
      duration: parseInt(note.duration) || 0,
      type: note.type,
      isRest: !!note.rest,
      rawData: note
    }));
  }

  /**
   * 조성 정보 추출
   * @param {Object} parsedData - 파싱된 MusicXML 데이터
   * @returns {Object} 조성 정보 { fifths, mode }
   */
  extractKeySignature(parsedData) {
    try {
      const firstPart = parsedData.parts[0];
      if (!firstPart) return { fifths: 0, mode: 'major' };

      const firstMeasure = firstPart.measures[0];
      if (!firstMeasure) return { fifths: 0, mode: 'major' };

      const key = firstMeasure.attributes?.key;
      if (!key) return { fifths: 0, mode: 'major' };

      return {
        fifths: parseInt(key.fifths) || 0,
        mode: key.mode || 'major'
      };
    } catch (error) {
      console.error('조성 정보 추출 실패:', error);
      return { fifths: 0, mode: 'major' };
    }
  }

  /**
   * 박자 정보 추출
   */
  extractTimeSignature(parsedData) {
    try {
      const firstPart = parsedData.parts[0];
      const firstMeasure = firstPart?.measures[0];
      const time = firstMeasure?.attributes?.time;

      if (!time) return { beats: 4, beatType: 4 };

      return {
        beats: parseInt(time.beats) || 4,
        beatType: parseInt(time['beat-type']) || 4
      };
    } catch (error) {
      console.error('박자 정보 추출 실패:', error);
      return { beats: 4, beatType: 4 };
    }
  }
}

// 싱글톤 인스턴스 export
export default new XMLParser();
