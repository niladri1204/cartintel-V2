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
                <span className="step-number">{step.number}</span>
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
              <div className="live-panel">
                <span>cartintel › intelligence</span>
                <div className="live-line"><b>Product</b><strong>Matched</strong></div>
                <div className="live-line"><b>Market</b><strong>Compared</strong></div>
                <div className="live-line"><b>Recommendation</b><strong>Ready</strong></div>
              </div>
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