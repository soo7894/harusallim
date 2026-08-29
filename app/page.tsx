const APP_URL = "./app/";

export default function Homepage() {
  return <div className="landing-page">
    <header className="landing-header">
      <a className="landing-brand" href="#top" aria-label="하루살림 홈페이지 처음으로">
        <span className="brand-mark">ㅎ</span>
        <span><strong>하루살림</strong><small>쉬운 돈 관리</small></span>
      </a>
      <nav aria-label="홈페이지 메뉴">
        <a href="#features">주요 기능</a>
        <a href="#safety">데이터 안내</a>
        <a className="header-app-link" href={APP_URL}>앱 시작하기</a>
      </nav>
    </header>

    <main id="top">
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">기록은 가볍게, 흐름은 또렷하게</p>
          <h1 id="hero-title">오늘의 돈 생활을<br /><em>차근차근 돌보세요.</em></h1>
          <p className="landing-lead">수입과 지출, 투자 내역을 한곳에 기록하고<br className="desktop-break" /> 내 자산의 변화를 편안하게 확인하는 가계부예요.</p>
          <div className="landing-actions">
            <a className="landing-primary" href={APP_URL}>하루살림 앱 열기 <span aria-hidden="true">→</span></a>
            <a className="landing-secondary" href={`${APP_URL}?guest=1`}>로그인 없이 둘러보기</a>
          </div>
          <p className="landing-caption">둘러보기에서는 샘플 데이터를 사용하며 입력 내용이 저장되지 않아요.</p>
        </div>
        <div className="landing-preview" aria-label="하루살림 앱 화면 예시">
          <div className="preview-window">
            <div className="preview-top"><i /><i /><i /><span>나의 하루살림</span></div>
            <div className="preview-card preview-total"><small>이번 달 남은 금액</small><strong>1,284,000원</strong><span>차분하게 잘 관리하고 있어요</span></div>
            <div className="preview-grid">
              <div className="preview-card"><span className="preview-icon mint">＋</span><small>이번 달 수입</small><strong>3,200,000원</strong></div>
              <div className="preview-card"><span className="preview-icon peach">－</span><small>이번 달 지출</small><strong>1,916,000원</strong></div>
            </div>
            <div className="preview-list"><span /><span /><span /></div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features" aria-labelledby="features-title">
        <p className="landing-eyebrow">하루살림으로 할 수 있는 일</p>
        <h2 id="features-title">복잡하지 않게, 꼭 필요한 만큼</h2>
        <div className="feature-grid">
          <article><span>✎</span><h3>수입·지출 기록</h3><p>날짜와 분류, 메모를 더해 생활비의 흐름을 남겨요.</p></article>
          <article><span>↗</span><h3>투자 자산 확인</h3><p>한국과 미국 주식의 매수 내역과 평가액을 함께 살펴봐요.</p></article>
          <article><span>⌂</span><h3>기기마다 이어보기</h3><p>Google 계정으로 로그인하면 다른 기기에서도 기록을 이어볼 수 있어요.</p></article>
        </div>
      </section>

      <section className="landing-safety" id="safety" aria-labelledby="safety-title">
        <div><p className="landing-eyebrow">내 기록을 내 계정에</p><h2 id="safety-title">가계 정보는 사용자별로<br />따로 보관해요.</h2></div>
        <p>로그인한 사용자의 기록은 Firebase 보안 규칙으로 분리됩니다. 먼저 살펴보고 싶다면 저장되지 않는 둘러보기 모드를 이용할 수 있어요.</p>
      </section>
    </main>

    <footer><span>하루살림</span><p>일상을 돌보듯, 내 돈도 천천히.</p><a href={APP_URL}>앱으로 이동</a></footer>
  </div>;
}
