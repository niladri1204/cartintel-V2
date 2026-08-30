"use client";

import { useState } from "react";

const howItWorks = [
  {
    number: "01",
    title: "Visit Product",
    body: "Browse any product page on Amazon, Flipkart, or other supported retail sites.",
  },
  {
    number: "02",
    title: "AI Understands Product",
    body: "CartIntel extracts the product identity, specifications, features, and key details.",
  },
  {
    number: "03",
    title: "Compare Across Websites",
    body: "It cross-checks prices, seller information, reviews, and available options automatically.",
  },
  {
    number: "04",
    title: "Best Recommendation",
    body: "CartIntel identifies the strongest buying option using price and product intelligence.",
  },
];

const features = [
  {
    tag: "01 — PRODUCT MATCHING",
    title: "Find the same product everywhere",
    body: "CartIntel identifies the product you are viewing and maps it to equivalent listings across supported retailers.",
  },
  {
    tag: "02 — PRICE COMPARISON",
    title: "Compare prices instantly",
    body: "See relevant prices across marketplaces so you can understand where the product is actually cheaper.",
  },
  {
    tag: "03 — REVIEW INTELLIGENCE",
    title: "Understand reviews faster",
    body: "CartIntel turns large volumes of review information into useful signals so important issues are easier to spot.",
  },
  {
    tag: "04 — BUYING RECOMMENDATION",
    title: "Make the better purchase",
    body: "Combine product identity, price, seller information, and review intelligence into one buying recommendation.",
  },
];

const stats = [
  { value: "50+", label: "supported stores" },
  { value: "4", label: "intelligence stages" },
  { value: "1", label: "buying recommendation" },
  { value: "100%", label: "free to use" },
];

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <div className="cartintel-app">
      <div className="bg-ribbons" aria-hidden="true" />
      <div className="grain-overlay" aria-hidden="true" />

      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#top" className="brand" aria-label="CartIntel home">
          <span>CartIntel</span>
        </a>

        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#demo">Demo</a>
        </div>

        <div className="nav-actions">
          <a className="nav-secondary" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          <a className="nav-primary" href="#install">Add to Chrome</a>
        </div>
      </nav>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              AI-POWERED SHOPPING INTELLIGENCE
            </div>

            <h1 id="hero-title">
              Your <em>AI</em> Shopping
              <br />
              Copilot.
            </h1>

            <p className="hero-description">
              Find the best price, understand reviews, and discover better
              alternatives across the web.
            </p>

            <div className="hero-actions">
              <a className="primary-button" href="#install">
                <span className="chrome-symbol" aria-hidden="true">◉</span>
                Add to Chrome
                <span aria-hidden="true">→</span>
              </a>
              <a className="secondary-button" href="#how-it-works">
                How It Works
              </a>
            </div>

            <div className="trust-row">
              <span><b>✓</b> 100% Free &amp; Secure</span>
              <span><b>⌁</b> Privacy Focused</span>
              <span><b>✦</b> Works on 50+ Stores</span>
            </div>
          </div>
        </section>

        <section className="stats-section" aria-label="CartIntel overview">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section id="how-it-works" className="content-section how-section">
          <div className="section-heading centered">
            <span className="section-kicker">HOW IT WORKS</span>
            <h2>Shopping intelligence in four steps.</h2>
            <p>CartIntel automatically guides your shopping journey from product detection to a better buying decision.</p>
          </div>

          <div className="steps-grid">
            {howItWorks.map((step, index) => (
              <article className="step-card" key={step.number}>
                <div className="step-icon" aria-hidden="true">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="demo" className="content-section demo-section">
          <div className="section-heading centered">
            <span className="section-kicker">DEMO SHOWCASE</span>
            <h2>See CartIntel in action.</h2>
            <p>From product detection to AI-powered buying recommendations in seconds.</p>
          </div>

          <div className="demo-shell">
            <div className="demo-browser-bar">
              <span className="browser-dots"><i /><i /><i /></span>
              <span className="browser-address">amazon.in/product/example-product</span>
              <span className="match-pill">✓ Product Matched</span>
            </div>
            <div className="demo-grid">
              <div className="demo-panel product-panel">
                <span className="mini-label">CURRENT PRODUCT</span>
                <div className="product-placeholder">PRODUCT</div>
                <h3>Product Intelligence</h3>
                <p>CartIntel identifies the product and prepares it for cross-store comparison.</p>
              </div>
              <div className="demo-panel">
                <span className="mini-label">MARKET COMPARISON</span>
                {["Amazon", "Flipkart", "Croma", "Reliance"].map((store, index) => (
                  <div className="market-row" key={store}>
                    <span>{store}</span>
                    <strong>{index === 1 ? "Best deal" : index === 2 ? "Comparable" : "Checked"}</strong>
                  </div>
                ))}
              </div>
              <div className="demo-panel insight-panel">
                <span className="mini-label">AI INSIGHTS</span>
                <p>✓ Seller and price comparison</p>
                <p>✓ Review intelligence</p>
                <p>✓ Better buying recommendation</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="content-section features-section">
          <div className="section-heading">
            <span className="section-kicker">CARTINTEL INTELLIGENCE</span>
            <h2>Everything you need to buy better.</h2>
            <p>Each layer of CartIntel works together to turn scattered shopping information into one clear recommendation.</p>
          </div>

          <div className="feature-layout">
            <div className="feature-list">
              {features.map((feature, index) => (
                <button
                  key={feature.tag}
                  className={`feature-item ${activeFeature === index ? "active" : ""}`}
                  onClick={() => setActiveFeature(index)}
                >
                  <span>{feature.tag}</span>
                  <strong>{feature.title}</strong>
                </button>
              ))}
            </div>

            <div className="feature-detail">
              <span className="section-kicker">{features[activeFeature].tag}</span>
              <h3>{features[activeFeature].title}</h3>
              <p>{features[activeFeature].body}</p>

              {activeFeature === 0 && (
                <div className="live-panel matching-panel">
                  <div className="panel-header">
                    <span>cartintel › universal_product_matching</span>
                    <span className="badge-confidence">99.4% Match</span>
                  </div>
                  <div className="matched-target">
                    <span className="target-label">DETECTED IDENTITY</span>
                    <strong>Sony WH-1000XM5 Wireless Noise Canceling</strong>
                    <div className="target-specs">
                      <span>Brand: Sony</span>
                      <span>Model: WH-1000XM5</span>
                      <span>Color: Black</span>
                    </div>
                  </div>
                  <div className="matched-retailers">
                    <span className="target-label">CROSS-RETAILER LISTINGS</span>
                    <div className="retailer-row">
                      <span className="store-name">Amazon</span>
                      <span className="match-status exact">✓ Exact Match</span>
                    </div>
                    <div className="retailer-row">
                      <span className="store-name">Flipkart</span>
                      <span className="match-status exact">✓ Exact Match</span>
                    </div>
                    <div className="retailer-row">
                      <span className="store-name">Croma</span>
                      <span className="match-status exact">✓ Exact Match</span>
                    </div>
                    <div className="retailer-row">
                      <span className="store-name">Reliance Digital</span>
                      <span className="match-status exact">✓ Exact Match</span>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === 1 && (
                <div className="live-panel pricing-panel">
                  <div className="panel-header">
                    <span>cartintel › price_comparison_engine</span>
                    <span className="badge-confidence savings">Save ₹4,000</span>
                  </div>
                  <div className="price-highlight-card">
                    <div className="price-col">
                      <span className="target-label">CURRENT (AMAZON)</span>
                      <strong className="current-price">₹28,990</strong>
                    </div>
                    <div className="price-divider">→</div>
                    <div className="price-col">
                      <span className="target-label">BEST DEAL (FLIPKART)</span>
                      <strong className="best-price">₹24,990</strong>
                    </div>
                  </div>
                  <div className="matched-retailers">
                    <span className="target-label">MARKETPLACE PRICE BREAKDOWN</span>
                    <div className="retailer-row best">
                      <div className="store-meta">
                        <span className="store-name">Flipkart</span>
                        <span className="mini-tag">Lowest Price</span>
                      </div>
                      <strong className="row-price highlight">₹24,990</strong>
                    </div>
                    <div className="retailer-row">
                      <div className="store-meta">
                        <span className="store-name">Croma</span>
                        <span className="mini-tag">₹2,500 Cheaper</span>
                      </div>
                      <strong className="row-price">₹26,490</strong>
                    </div>
                    <div className="retailer-row">
                      <div className="store-meta">
                        <span className="store-name">Reliance Digital</span>
                        <span className="mini-tag">₹1,000 Cheaper</span>
                      </div>
                      <strong className="row-price">₹27,990</strong>
                    </div>
                    <div className="retailer-row current">
                      <div className="store-meta">
                        <span className="store-name">Amazon</span>
                        <span className="mini-tag muted">Current Store</span>
                      </div>
                      <strong className="row-price muted">₹28,990</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === 2 && (
                <div className="live-panel reviews-panel">
                  <div className="panel-header">
                    <span>cartintel › review_sentiment_synthesis</span>
                    <span className="badge-confidence">8,420 Verified Reviews</span>
                  </div>
                  <div className="sentiment-bar-card">
                    <div className="sentiment-stats">
                      <span className="target-label">AI SENTIMENT SCORE</span>
                      <strong className="sentiment-score">4.6 <span>/ 5.0</span></strong>
                    </div>
                    <div className="sentiment-meter">
                      <div className="meter-fill" style={{ width: "88%" }} />
                      <span className="meter-label">88% Positive Signals</span>
                    </div>
                  </div>
                  <div className="review-signals">
                    <div className="signal-item positive">
                      <span className="signal-icon">✓</span>
                      <div className="signal-content">
                        <strong>Top Strengths</strong>
                        <p>Industry-leading active noise cancellation and balanced spatial clarity.</p>
                      </div>
                    </div>
                    <div className="signal-item positive">
                      <span className="signal-icon">✓</span>
                      <div className="signal-content">
                        <strong>Battery Life</strong>
                        <p>Reliable 30+ hour playback with 3-minute quick charging.</p>
                      </div>
                    </div>
                    <div className="signal-item alert">
                      <span className="signal-icon">⚠</span>
                      <div className="signal-content">
                        <strong>Key Consideration</strong>
                        <p>Non-folding headband design requires more case space during travel.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeature === 3 && (
                <div className="live-panel decision-panel">
                  <div className="panel-header">
                    <span>cartintel › buying_recommendation</span>
                    <span className="badge-confidence verdict">Top Recommendation</span>
                  </div>

                  <div className="recommendation-hero-card">
                    <div className="rec-top-row">
                      <div>
                        <span className="target-label">BEST BUYING OPTION</span>
                        <strong className="rec-merchant">Flipkart</strong>
                      </div>
                      <div className="rec-price-box">
                        <strong className="rec-price">₹24,990</strong>
                        <span className="rec-savings">Save ₹4,000</span>
                      </div>
                    </div>
                    <div className="rec-meta-row">
                      <span>✓ Seller: <b>SuperComNet (98% Rating)</b></span>
                      <span>✓ <b>Free 2-Day Delivery</b></span>
                    </div>
                  </div>

                  <div className="decision-pillars">
                    <span className="target-label">WHY CARTINTEL RECOMMENDS THIS</span>
                    <div className="pillar-row">
                      <span className="pillar-num">1</span>
                      <div className="pillar-text">
                        <strong>Lowest Verified Price</strong>
                        <p>₹24,990 is the cheapest authentic listing across 4 major retailers.</p>
                      </div>
                    </div>
                    <div className="pillar-row">
                      <span className="pillar-num">2</span>
                      <div className="pillar-text">
                        <strong>Exact Identity &amp; Warranty</strong>
                        <p>100% genuine model match with full manufacturer brand warranty.</p>
                      </div>
                    </div>
                    <div className="pillar-row">
                      <span className="pillar-num">3</span>
                      <div className="pillar-text">
                        <strong>Seller Trust &amp; Reviews</strong>
                        <p>High seller reliability score and 4.6★ positive customer sentiment.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="install" className="install-section">
          <span className="section-kicker">GET STARTED</span>
          <h2>Shop smarter with CartIntel.</h2>
          <p>Install the extension and let CartIntel work alongside you while you shop.</p>
          <a className="primary-button large" href="#top">Add to Chrome <span aria-hidden="true">→</span></a>
        </section>
      </main>

      <footer className="site-footer">
        <span>© 2026 CartIntel</span>
        <div>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#install">Install</a>
        </div>
      </footer>
    </div>
  );
}