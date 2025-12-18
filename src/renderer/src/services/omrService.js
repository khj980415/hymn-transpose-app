import axios from 'axios';

/**
 * OMR (Optical Music Recognition) 서비스
 * 이미지를 MusicXML로 변환
 */
class OMRService {
  constructor() {
    // 개발 모드: 더미 데이터 사용
    this.useDummyData = true;

    // 실제 API 엔드포인트 (나중에 설정)
    // 브라우저/렌더러 환경에서는 `process`가 없을 수 있으므로
    // Vite의 `import.meta.env`를 우선 사용하고, 없을 경우 안전하게 체크합니다.
    this.apiEndpoint = (typeof process !== 'undefined' && process.env && process.env.VITE_OMR_API_ENDPOINT) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OMR_API_ENDPOINT) || '';
  }

  /**
   * 이미지 파일을 MusicXML로 변환
   * @param {File} imageFile - 업로드된 이미지 파일
   * @returns {Promise<string>} MusicXML 문자열
   */
  async convertToMusicXML(imageFile) {
    if (this.useDummyData) {
      return this.getDummyMusicXML();
    }

    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await axios.post(this.apiEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60초 타임아웃
      });

      return response.data.musicxml || response.data;
    } catch (error) {
      console.error('OMR API 호출 실패:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * 더미 MusicXML 데이터 (테스트용)
   * 간단한 찬송가 멜로디 (C 장조, 4/4박자)
   */
  getDummyMusicXML() {
    return new Promise((resolve) => {
      // 실제 변환 시뮬레이션을 위한 딜레이
      setTimeout(() => {
        resolve(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>찬송가 예제</work-title>
  </work>
  <identification>
    <creator type="composer">작곡가</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <!-- 1마디 -->
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <octave>5</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>

    <!-- 2마디 -->
    <measure number="2">
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <type>half</type>
      </note>
    </measure>

    <!-- 3마디 -->
    <measure number="3">
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>

    <!-- 4마디 -->
    <measure number="4">
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <type>half</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <type>half</type>
      </note>
      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>
    </measure>
  </part>
</score-partwise>`);
      }, 2000); // 2초 딜레이
    });
  }

  /**
   * 에러 메시지 포맷팅
   */
  getErrorMessage(error) {
    if (error.response) {
      // 서버 응답 있음
      return `서버 오류: ${error.response.status} - ${error.response.data?.message || '알 수 없는 오류'}`;
    } else if (error.request) {
      // 요청 전송했으나 응답 없음
      return '서버에 연결할 수 없습니다. 네트워크를 확인하세요.';
    } else {
      // 요청 설정 중 오류
      return `오류: ${error.message}`;
    }
  }

  /**
   * 실제 API 사용 모드로 전환
   */
  enableRealAPI(endpoint) {
    this.useDummyData = false;
    this.apiEndpoint = endpoint;
  }

  /**
   * 더미 데이터 모드로 전환
   */
  enableDummyMode() {
    this.useDummyData = true;
  }
}

// 싱글톤 인스턴스 export
export default new OMRService();
