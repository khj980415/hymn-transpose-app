/**
 * Browser-friendly MusicXML parser using DOMParser.
 * Replaces node-only `xml2js` so it works in Vite/Electron renderer.
 */
class XMLParser {
  constructor() {}

  async parse(xmlString) {
    try {
      const doc = new DOMParser().parseFromString(xmlString, 'application/xml');

      const score = doc.querySelector('score-partwise');
      if (!score) {
        throw new Error('유효하지 않은 MusicXML 형식입니다.');
      }

      return {
        title: this.extractTitle(score),
        composer: this.extractComposer(score),
        parts: this.extractParts(score),
        rawData: score
      };
    } catch (error) {
      console.error('XML 파싱 실패:', error);
      throw new Error('악보 데이터를 읽을 수 없습니다. XML 형식을 확인하세요.');
    }
  }

  extractTitle(score) {
    const wt = score.querySelector('work > work-title');
    return (wt && wt.textContent.trim()) || '제목 없음';
  }

  extractComposer(score) {
    const composerNode = score.querySelector('identification > creator[type="composer"]');
    if (composerNode && composerNode.textContent) return composerNode.textContent.trim();

    // fallback: 첫 creator 노드
    const firstCreator = score.querySelector('identification > creator');
    return (firstCreator && firstCreator.textContent.trim()) || '작곡가 미상';
  }

  extractParts(score) {
    const partNodes = Array.from(score.querySelectorAll('part'));
    if (!partNodes.length) return [];

    return partNodes.map((partNode, idx) => {
      const id = partNode.getAttribute('id') || `P${idx + 1}`;
      const partNameNode = Array.from(score.querySelectorAll('score-part')).find((p) => p.getAttribute('id') === id);
      const name = (partNameNode && partNameNode.querySelector('part-name') && partNameNode.querySelector('part-name').textContent.trim()) || `Part ${idx + 1}`;

      return {
        id,
        name,
        measures: this.extractMeasures(partNode)
      };
    });
  }

  extractMeasures(partNode) {
    const measureNodes = Array.from(partNode.querySelectorAll('measure'));
    return measureNodes.map((m) => ({
      number: parseInt(m.getAttribute('number')) || 0,
      attributes: this.extractAttributes(m),
      notes: this.extractNotes(m),
      rawData: m
    }));
  }

  extractAttributes(measureNode) {
    const attrNode = measureNode.querySelector('attributes');
    if (!attrNode) return {};

    const divisions = attrNode.querySelector('divisions')?.textContent;
    const keyNode = attrNode.querySelector('key');
    const timeNode = attrNode.querySelector('time');
    const clefNode = attrNode.querySelector('clef');

    return {
      divisions: divisions ? parseInt(divisions) : undefined,
      key: keyNode
        ? {
            fifths: parseInt(keyNode.querySelector('fifths')?.textContent) || 0,
            mode: keyNode.querySelector('mode')?.textContent || 'major'
          }
        : undefined,
      time: timeNode
        ? {
            beats: parseInt(timeNode.querySelector('beats')?.textContent) || 4,
            'beat-type': parseInt(timeNode.querySelector('beat-type')?.textContent) || 4
          }
        : undefined,
      clef: clefNode
        ? {
            sign: clefNode.querySelector('sign')?.textContent || null,
            line: parseInt(clefNode.querySelector('line')?.textContent) || null
          }
        : undefined
    };
  }

  extractNotes(measureNode) {
    const noteNodes = Array.from(measureNode.querySelectorAll('note'));
    return noteNodes.map((note) => {
      const rest = note.querySelector('rest') !== null;
      const pitchNode = note.querySelector('pitch');
      const duration = note.querySelector('duration')?.textContent;
      const type = note.querySelector('type')?.textContent;

      return {
        pitch: pitchNode
          ? {
              step: pitchNode.querySelector('step')?.textContent || null,
              alter: pitchNode.querySelector('alter') ? parseInt(pitchNode.querySelector('alter').textContent) || 0 : 0,
              octave: pitchNode.querySelector('octave') ? parseInt(pitchNode.querySelector('octave').textContent) : null
            }
          : null,
        duration: duration ? parseInt(duration) : 0,
        type: type || null,
        isRest: rest,
        rawData: note
      };
    });
  }

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

export default new XMLParser();
