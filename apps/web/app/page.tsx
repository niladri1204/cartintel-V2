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
  { value: "200+", label: "supported stores" },
  { value: "4", label: "intelligence stages" },
  { value: "1", label: "buying recommendation" },
  { value: "100%", label: "free to use" },
];

export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanCount, setScanCount] = useState(6);
  const [demoCheckoutState, setDemoCheckoutState] = useState<"idle" | "simulating" | "completed">("idle");

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setScanCount(6);
    }, 600);
  };

  const handleDemoCheckout = () => {
    if (demoCheckoutState !== "idle") return;
    setDemoCheckoutState("simulating");
    setTimeout(() => {
      setDemoCheckoutState("completed");
      setTimeout(() => {
        setDemoCheckoutState("idle");
      }, 2000);
    }, 700);
  };

  return (
    <div className="cartintel-app">
      <div className="bg-ribbons" aria-hidden="true" />
      <div className="grain-overlay" aria-hidden="true" />

      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#top" className="brand" aria-label="CartIntel home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cartintel-logo.png"
            alt="CartIntel Logo"
            className="brand-logo"
            width={26}
            height={26}
          />
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
              <span><b>✦</b> Works on 200+ Stores</span>
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
              <span className="browser-address">flipkart.com/apple-iphone-16-black-128-gb/p/itm12345</span>
              <span className="match-pill">✓ Product Matched</span>
            </div>
            <div className="demo-grid">
              <div className="demo-panel product-panel">
                <div>
                  <div className="panel-header-row">
                    <span className="mini-label">CURRENT PRODUCT</span>
                    <span className="source-pill">Flipkart</span>
                  </div>
                  <div className="product-image-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/iphone-16.png"
                      alt="Apple iPhone 16"
                      className="product-showcase-img"
                    />
                  </div>
                  <div className="product-meta-header">
                    <h3>Apple iPhone 16</h3>
                    <div className="current-price-tag">
                      <span className="price-source">Current Price:</span>
                      <strong className="price-amount">₹69,990</strong>
                    </div>
                  </div>
                  <p className="product-summary-text">
                    CartIntel identifies the product and prepares it for cross-store comparison.
                  </p>
                </div>

                <button
                  type="button"
                  className={`analyze-trigger-btn ${isAnalyzing ? "loading" : ""}`}
                  onClick={handleAnalyze}
                  title="Click to scan supported marketplaces"
                >
                  <span className="btn-dot" aria-hidden="true" />
                  <span>{isAnalyzing ? "Scanning Marketplaces..." : "Analyse Current Product"}</span>
                </button>
              </div>

              <div className="demo-panel market-panel">
                <div>
                  <div className="panel-header-row">
                    <span className="mini-label">MARKETPLACE OFFERS</span>
                    <span className="scan-indicator-badge">
                      {isAnalyzing ? "Scanning..." : `${scanCount} Offers Found`}
                    </span>
                  </div>

                  <div className="market-offers-list">
                    {[
                      { store: "Flipkart", status: "Current Store", price: "₹69,990", isBest: false },
                      { store: "Amazon", status: "Best deal (-₹3,500)", price: "₹66,490", isBest: true },
                      { store: "Croma", status: "Comparable", price: "₹67,990", isBest: false },
                      { store: "Vijay Sales", status: "Comparable", price: "₹68,490", isBest: false },
                      { store: "Reliance Digital", status: "Checked", price: "₹68,990", isBest: false },
                      { store: "Apple Store", status: "Official Store", price: "₹79,900", isBest: false },
                    ].map((item) => (
                      <div className={`market-row ${item.isBest ? "best-deal" : ""}`} key={item.store}>
                        <div className="market-store-col">
                          <span className="market-store-name">{item.store}</span>
                          <small className="market-store-status">{item.status}</small>
                        </div>
                        <strong>{item.price}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="market-scan-footer">
                  <span className="sync-text">✓ Real-time price sync active</span>
                </div>
              </div>

              <div className="demo-panel insight-panel">
                <div>
                  <div className="panel-header-row">
                    <span className="mini-label">AI BUYING RECOMMENDATION</span>
                    <span className="status-dot-badge">AI Verified</span>
                  </div>

                  <div className="demo-verdict-card">
                    <div className="verdict-top">
                      <span className="verdict-tag">Top Recommendation</span>
                      <span className="verdict-savings">Save ₹3,500</span>
                    </div>
                    <strong className="verdict-store">Amazon India</strong>
                    <div className="verdict-price-row">
                      <span className="verdict-price">₹66,490</span>
                      <del>₹69,990</del>
                    </div>
                  </div>

                  <div className="insight-bullets">
                    <p>✓ Lowest verified price across 6 supported marketplaces</p>
                    <p>✓ 94% positive sentiment across 12,400+ reviews</p>
                    <p>✓ Top-rated seller with full 1-Year Apple Warranty</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`buy-amazon-btn ${demoCheckoutState !== "idle" ? "active-demo" : ""}`}
                  onClick={handleDemoCheckout}
                  title="Demo action: Buy directly from Amazon"
                >
                  {demoCheckoutState === "simulating" ? (
                    <span>Opening Best Deal Demo...</span>
                  ) : demoCheckoutState === "completed" ? (
                    <span style={{ color: "#a8ddb5" }}>✓ Deal Applied (Save ₹3,500)</span>
                  ) : (
                    <>
                      <span>Buy directly from Amazon</span>
                      <span className="btn-arrow" aria-hidden="true">→</span>
                    </>
                  )}
                </button>
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
                  onMouseEnter={() => setActiveFeature(index)}
                  onClick={() => setActiveFeature(index)}
                >
                  <span>{feature.tag}</span>
                  <strong>{feature.title}</strong>
                </button>
              ))}
            </div>

            <div className="feature-detail">
              <div className="feature-detail-header">
                <span className="section-kicker">{features[activeFeature].tag}</span>
                <h3>{features[activeFeature].title}</h3>
                <p>{features[activeFeature].body}</p>
              </div>

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
                      <span className="store-name">Vijay Sales</span>
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
                          <span className="store-name">Vijay Sales</span>
                          <span className="mini-tag">₹1,500 Cheaper</span>
                        </div>
                        <strong className="row-price">₹27,490</strong>
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
                        <p>Industry-leading noise cancellation and spatial audio clarity.</p>
                      </div>
                    </div>
                    <div className="signal-item alert">
                      <span className="signal-icon">⚠</span>
                      <div className="signal-content">
                        <strong>Key Consideration</strong>
                        <p>Non-folding headband requires dedicated space in travel bags.</p>
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
                    <div className="pillar-row">
                      <span className="pillar-num">1</span>
                      <div className="pillar-text">
                        <strong>Lowest Verified Price</strong>
                        <p>₹24,990 is the cheapest authentic listing across major stores.</p>
                      </div>
                    </div>
                    <div className="pillar-row">
                      <span className="pillar-num">2</span>
                      <div className="pillar-text">
                        <strong>Seller Trust &amp; Warranty</strong>
                        <p>Top-rated merchant fulfillment with full brand warranty.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="install" className="install-section">
          <span className="section-kicker">READY IN SECONDS</span>
          <h2>Turn scattered shopping into clear decisions.</h2>
          <p>Let CartIntel analyze prices, seller reliability, and product sentiment every time you browse.</p>
          <a className="primary-button large" href="#top">Install Extension <span aria-hidden="true">→</span></a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cartintel-logo.png"
            alt="CartIntel Logo"
            className="footer-logo"
            width={18}
            height={18}
          />
          <span>© 2026 CartIntel</span>
        </div>
        <div>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#install">Install</a>
        </div>
      </footer>
    </div>
  );
}