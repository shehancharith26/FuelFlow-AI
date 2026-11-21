import { useState } from 'react';
import {
  Trophy,
  Sparkles,
  Compass,
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  ShieldCheck,
  Layers,
  Cpu,
  Database,
  Activity,
  Car,
  Ticket,
  Gauge,
  Zap,
  BarChart3,
  AlertTriangle,
  Server,
  Code2,
  ChevronRight,
  Fuel
} from 'lucide-react';

export default function ProjectShowcase({ onNavigate }) {
  const [activeStoryTab, setActiveStoryTab] = useState('challenge'); // 'challenge' | 'solution' | 'impact'

  return (
    <div className="portal-container showcase-portal">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
       <section className="showcase-hero-section">
        <div className="showcase-hero-glow" />

        {/* Hero Headline & Subhead */}
        <div className="hero-content">
          <h1 className="hero-main-title">
            Smarter Fuel Queues. <br />
            <span className="gradient-text">Intelligent Station Decisions.</span>
          </h1>
          <p className="hero-lead-text">
            FuelFlow AI is an intelligent fuel station discovery, machine-learning wait-time prediction,
            and dynamic pump allocation software prototype designed for the Kegalle, Sri Lanka transport corridor.
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="hero-cta-group">
          <button
            type="button"
            className="btn-showcase-primary"
            onClick={() => onNavigate('driver')}
          >
            <Compass size={18} />
            <span>Explore Driver Portal</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn-showcase-secondary"
            onClick={() => onNavigate('manager')}
          >
            <LayoutDashboard size={18} />
            <span>Explore Manager Portal</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Cinematic Fuel Station Visual */}
        <div className="hero-cinematic-wrap">
         <div
  className="hero-cinematic-frame"
  aria-label="Concept visualisation of an AI-powered smart fuel station"
  style={{
    backgroundImage: "url('/fuelflow-hero.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
>
    </div>       
          <div className="cinematic-caption">
            <span className="caption-label">Concept Visualisation</span>
            <span className="caption-sep">•</span>
            <span className="caption-text">AI-Powered Smart Fuel Station — Prototype Scenario</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. EVALUATOR QUICK START / DEMO JOURNEY                                   */}
      {/* ========================================================================= */}
      <section className="showcase-section" id="evaluator-guide">
        <div className="section-header-centered">
          <div className="section-badge-pill">
            <Sparkles size={14} className="text-cyan" />
            <span>PORTFOLIO REVIEW GUIDE</span>
          </div>
          <h2 className="section-heading">How to Evaluate FuelFlow AI in 4 Steps</h2>
          <p className="section-subheading">
            Follow this suggested end-to-end user journey to test the real backend, ML model, and SQLite database.
          </p>
        </div>

        <div className="evaluator-steps-grid">
          <div className="eval-step-card" onClick={() => onNavigate('driver')}>
            <div className="eval-step-num">01</div>
            <div className="eval-step-icon cyan">
              <Compass size={20} />
            </div>
            <h3 className="eval-step-title">Discover Stations</h3>
            <p className="eval-step-desc">
              Open the <strong>Driver Portal</strong>. Filter by fuel type, adjust your location along the Kegalle corridor, and examine multi-criteria weighted station recommendations.
            </p>
            <div className="eval-step-cta">
              <span>Open Driver Portal</span>
              <ChevronRight size={14} />
            </div>
          </div>

          <div className="eval-step-card" onClick={() => onNavigate('driver')}>
            <div className="eval-step-num">02</div>
            <div className="eval-step-icon emerald">
              <Ticket size={20} />
            </div>
            <h3 className="eval-step-title">Join Virtual Queue</h3>
            <p className="eval-step-desc">
              Use a 1-click preset (e.g. <em>Daily Commuter</em>) or enter a custom plate. Submit to create a real SQLite record and view your live digital virtual ticket.
            </p>
            <div className="eval-step-cta">
              <span>Test Registration</span>
              <ChevronRight size={14} />
            </div>
          </div>

          <div className="eval-step-card" onClick={() => onNavigate('manager')}>
            <div className="eval-step-num">03</div>
            <div className="eval-step-icon amber">
              <LayoutDashboard size={20} />
            </div>
            <h3 className="eval-step-title">Inspect Manager Hub</h3>
            <p className="eval-step-desc">
              Switch to the <strong>Manager Portal</strong>. Locate the <em>Virtual Queue Operations Hub</em> to see your newly registered vehicle live in SQLite with assigned pump and queue position.
            </p>
            <div className="eval-step-cta">
              <span>View Operations Hub</span>
              <ChevronRight size={14} />
            </div>
          </div>

          <div className="eval-step-card" onClick={() => onNavigate('manager')}>
            <div className="eval-step-num">04</div>
            <div className="eval-step-icon violet">
              <Cpu size={20} />
            </div>
            <h3 className="eval-step-title">Run Allocation Simulation</h3>
            <p className="eval-step-desc">
              Execute a 200-vehicle discrete-event simulation. Compare traditional First-Come First-Served (FCFS) against FuelFlow's Smart Pump Allocation algorithm.
            </p>
            <div className="eval-step-cta">
              <span>Run Simulation</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PROJECT STORY & THE PROBLEM                                            */}
      {/* ========================================================================= */}
      <section className="showcase-section">
        <div className="story-container">
          <div className="story-left">
            <div className="section-badge-pill">
              <Activity size={14} className="text-emerald" />
              <span>THE CHALLENGE & INSPIRATION</span>
            </div>
            <h2 className="section-heading text-left">
              Addressing Fuel Queue Chaos with Intelligent Allocation
            </h2>
            <p className="story-paragraph">
              During fuel crises and peak traffic hours in Sri Lanka, drivers frequently confront massive delays,
              inaccurate queue estimations, and stations that run dry without warning.
            </p>
            <p className="story-paragraph">
              Simultaneously, fuel station managers face operational gridlock. Traditional <strong>First-Come First-Served (FCFS)</strong> queueing creates severe bottlenecks: a single motorcycle occupying a multi-fuel pump or a heavy truck blocking diesel access slows down entire queues, idling dispensers while lines stretch down major roadways.
            </p>

            <div className="story-tabs-nav">
              <button
                type="button"
                className={`story-tab-btn ${activeStoryTab === 'challenge' ? 'active' : ''}`}
                onClick={() => setActiveStoryTab('challenge')}
              >
                The Bottlenecks
              </button>
              <button
                type="button"
                className={`story-tab-btn ${activeStoryTab === 'solution' ? 'active' : ''}`}
                onClick={() => setActiveStoryTab('solution')}
              >
                The FuelFlow AI Approach
              </button>
              <button
                type="button"
                className={`story-tab-btn ${activeStoryTab === 'impact' ? 'active' : ''}`}
                onClick={() => setActiveStoryTab('impact')}
              >
                Simulated Gains
              </button>
            </div>
          </div>

          <div className="story-right">
            {activeStoryTab === 'challenge' && (
              <div className="story-content-card">
                <h4 className="story-card-title text-amber">
                  <AlertTriangle size={18} />
                  Traditional Queue Inefficiencies
                </h4>
                <ul className="story-points-list">
                  <li>
                    <strong>Blind Travel:</strong> Drivers travel to stations without knowing whether compatible fuel is in stock or if queues exceed 60+ minutes.
                  </li>
                  <li>
                    <strong>Pump Misallocation:</strong> Under FCFS, any vehicle takes whatever pump is next, frequently trapping multi-product dispensers for low-volume users.
                  </li>
                  <li>
                    <strong>Physical Queue Idling:</strong> Hours spent idling in physical lines waste thousands of litres of fuel and cause road congestion.
                  </li>
                </ul>
              </div>
            )}

            {activeStoryTab === 'solution' && (
              <div className="story-content-card">
                <h4 className="story-card-title text-cyan">
                  <Zap size={18} />
                  Multi-Agent Intelligent Orchestration
                </h4>
                <ul className="story-points-list">
                  <li>
                    <strong>Multi-Criteria Scoring:</strong> Weights travel distance, queue backlog, and fuel availability to recommend optimal stations.
                  </li>
                  <li>
                    <strong>ML Wait Forecasts:</strong> A trained RandomForestRegressor estimates queue delay before departure.
                  </li>
                  <li>
                    <strong>Smart Dispatching:</strong> Discrete-event simulation pairs vehicle fuel requirements directly to compatible, idle, operational pumps.
                  </li>
                </ul>
              </div>
            )}

            {activeStoryTab === 'impact' && (
              <div className="story-content-card">
                <h4 className="story-card-title text-emerald">
                  <TrendingDown size={18} />
                  Demonstrated Simulation Results
                </h4>
                <ul className="story-points-list">
                  <li>
                    <strong>Up to 49.5% Peak Wait Reduction:</strong> Capping peak queue delays by matching heavy commercial and light passenger vehicles appropriately.
                  </li>
                  <li>
                    <strong>Higher Dispenser Utilization:</strong> Active pump idle times drop by 25–40% under dynamic bay dispatching.
                  </li>
                  <li>
                    <strong>Predictable Commutes:</strong> Remote virtual queue registration offers drivers sequential visibility before arrival.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. KEY FEATURES GRID (8 Cards)                                            */}
      {/* ========================================================================= */}
      <section className="showcase-section">
        <div className="section-header-centered">
          <div className="section-badge-pill">
            <Layers size={14} className="text-cyan" />
            <span>CORE CAPABILITIES</span>
          </div>
          <h2 className="section-heading">Key Features & Architectural Modules</h2>
          <p className="section-subheading">
            FuelFlow AI v1.1 combines responsive frontend interfaces, machine learning inference, and transactional persistence.
          </p>
        </div>

        <div className="features-showcase-grid">
          {/* Feature 1 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box cyan">
              <Compass size={22} />
            </div>
            <h3 className="feat-title">Intelligent Station Recommendation</h3>
            <p className="feat-desc">
              Multi-criteria decision algorithm evaluating physical distance, queue volume, and fuel availability scores to guide drivers away from congested stations.
            </p>
            <span className="feat-tag">Driver Portal</span>
          </div>

          {/* Feature 2 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box emerald">
              <Cpu size={22} />
            </div>
            <h3 className="feat-title">ML Queue Waiting-Time Prediction</h3>
            <p className="feat-desc">
              Trained <code>RandomForestRegressor</code> predicting wait times in minutes based on traffic arrival rates, pump configuration, and historical queue load.
            </p>
            <span className="feat-tag">scikit-learn Inference</span>
          </div>

          {/* Feature 3 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box amber">
              <Car size={22} />
            </div>
            <h3 className="feat-title">Driver Virtual Queue Registration</h3>
            <p className="feat-desc">
              Pre-arrival queue registration backed by SQLite transactions with atomic partial unique index <code>idx_vq_active_vehicle</code> preventing duplicate active queues.
            </p>
            <span className="feat-tag">POST /queue/join</span>
          </div>

          {/* Feature 4 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box cyan">
              <Ticket size={22} />
            </div>
            <h3 className="feat-title">Digital Virtual Queue Ticket</h3>
            <p className="feat-desc">
              Boarding-pass interface with live status badge, queue position tracker, ML wait forecast, clipboard copy, and <code>sessionStorage</code> persistence.
            </p>
            <span className="feat-tag">Real-Time Sync</span>
          </div>

          {/* Feature 5 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box violet">
              <LayoutDashboard size={22} />
            </div>
            <h3 className="feat-title">Manager Virtual Queue Hub</h3>
            <p className="feat-desc">
              Real-time read-only operations dashboard tracking all active and completed registrations with station filters, status filters, and live SQLite sync.
            </p>
            <span className="feat-tag">GET /queue/registrations</span>
          </div>

          {/* Feature 6 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box emerald">
              <Gauge size={22} />
            </div>
            <h3 className="feat-title">Smart Pump Allocation Simulation</h3>
            <p className="feat-desc">
              Discrete-event allocation engine dispatching queued vehicles to compatible, idle, operational fuel dispensers based on fuel type constraints.
            </p>
            <span className="feat-tag">Python Simulator</span>
          </div>

          {/* Feature 7 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box amber">
              <BarChart3 size={22} />
            </div>
            <h3 className="feat-title">FCFS vs. Smart Allocation Comparison</h3>
            <p className="feat-desc">
              Side-by-side benchmark measuring average wait, maximum queue duration, pump idle time, and vehicle clearance rates across 50 to 500 vehicle streams.
            </p>
            <span className="feat-tag">POST /simulate</span>
          </div>

          {/* Feature 8 */}
          <div className="feature-showcase-card">
            <div className="feat-icon-box cyan">
              <Database size={22} />
            </div>
            <h3 className="feat-title">SQLite Registration Persistence</h3>
            <p className="feat-desc">
              ACID-compliant relational database safely isolating driver virtual queue records (<code>virtual_queue_registrations</code>) from simulation runs (<code>simulation_summaries</code>).
            </p>
            <span className="feat-tag">SQLite3 Engine</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SYSTEM ARCHITECTURE (Interactive React/CSS Diagram)                    */}
      {/* ========================================================================= */}
      <section className="showcase-section">
        <div className="section-header-centered">
          <div className="section-badge-pill">
            <Server size={14} className="text-emerald" />
            <span>FULL-STACK ARCHITECTURE</span>
          </div>
          <h2 className="section-heading">System Architecture & Data Flow</h2>
          <p className="section-subheading">
            Strict separation between client interfaces, RESTful API services, machine learning inference, and database tables.
          </p>
        </div>

        <div className="arch-diagram-wrapper">
          {/* Tier 1: Client Layer */}
          <div className="arch-tier-block">
            <div className="arch-tier-header">
              <Code2 size={16} className="text-cyan" />
              <span>Presentation Layer (React 19 + Vite)</span>
            </div>
            <div className="arch-nodes-row">
              <div className="arch-node-box">
                <Compass size={18} className="text-cyan" />
                <div className="arch-node-title">Driver Portal</div>
                <div className="arch-node-sub">Station Discovery & Wait Predictions</div>
              </div>
              <div className="arch-node-box">
                <Ticket size={18} className="text-emerald" />
                <div className="arch-node-title">Virtual Queue Ticket</div>
                <div className="arch-node-sub">Boarding Pass & Live Polling</div>
              </div>
              <div className="arch-node-box">
                <LayoutDashboard size={18} className="text-amber" />
                <div className="arch-node-title">Manager Portal</div>
                <div className="arch-node-sub">Operations Hub & Simulator Controls</div>
              </div>
            </div>
          </div>

          {/* Flow Connector Arrow */}
          <div className="arch-flow-connector">
            <span className="connector-label">HTTP / JSON REST API • CORS Security</span>
            <div className="connector-arrow">↓</div>
          </div>

          {/* Tier 2: API Gateway Layer */}
          <div className="arch-tier-block">
            <div className="arch-tier-header">
              <Server size={16} className="text-emerald" />
              <span>Application & Services Layer (FastAPI + Python 3.13)</span>
            </div>
            <div className="arch-nodes-row">
              <div className="arch-node-box">
                <Cpu size={18} className="text-emerald" />
                <div className="arch-node-title">FastAPI Endpoints</div>
                <div className="arch-node-sub"><code>/queue/join</code> • <code>/predict</code> • <code>/simulate</code></div>
              </div>
              <div className="arch-node-box">
                <Activity size={18} className="text-cyan" />
                <div className="arch-node-title">ML Predictor Service</div>
                <div className="arch-node-sub">RandomForestRegressor Model Pipeline</div>
              </div>
              <div className="arch-node-box">
                <Gauge size={18} className="text-violet" />
                <div className="arch-node-title">Discrete Event Simulator</div>
                <div className="arch-node-sub">FCFS vs. Smart Pump Allocation Engine</div>
              </div>
            </div>
          </div>

          {/* Flow Connector Arrow */}
          <div className="arch-flow-connector">
            <span className="connector-label">SQLite Transactions (BEGIN IMMEDIATE) • Isolated Tables</span>
            <div className="connector-arrow">↓</div>
          </div>

          {/* Tier 3: Persistence Layer */}
          <div className="arch-tier-block persistence">
            <div className="arch-tier-header">
              <Database size={16} className="text-amber" />
              <span>Persistence & Storage Layer (SQLite3 fuelflow.db)</span>
            </div>
            <div className="arch-nodes-row">
              <div className="arch-node-box highlight-emerald">
                <Ticket size={18} className="text-emerald" />
                <div className="arch-node-title">virtual_queue_registrations</div>
                <div className="arch-node-sub">Real driver registrations with partial unique index protection</div>
              </div>
              <div className="arch-node-box highlight-cyan">
                <BarChart3 size={18} className="text-cyan" />
                <div className="arch-node-title">simulation_summaries</div>
                <div className="arch-node-sub">Historical discrete-event allocation simulation benchmarks</div>
              </div>
              <div className="arch-node-box highlight-muted">
                <ShieldCheck size={18} className="text-muted" />
                <div className="arch-node-title">fuelflow_backup.db</div>
                <div className="arch-node-sub">Protected, read-only hackathon benchmark baseline</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TECHNOLOGY STACK                                                       */}
      {/* ========================================================================= */}
      <section className="showcase-section">
        <div className="section-header-centered">
          <div className="section-badge-pill">
            <Code2 size={14} className="text-cyan" />
            <span>TECHNICAL SPECIFICATIONS</span>
          </div>
          <h2 className="section-heading">Built with Modern Engineering Foundations</h2>
          <p className="section-subheading">
            Accurate reflection of actual repository libraries, frameworks, and tools.
          </p>
        </div>

        <div className="tech-stack-grid">
          <div className="tech-category-card">
            <div className="tech-cat-header">
              <span className="tech-cat-title">Frontend Framework & UI</span>
              <span className="tech-cat-count">5 Core Packages</span>
            </div>
            <div className="tech-items-list">
              <div className="tech-item-row">
                <strong>React 19</strong>
                <span>Component state, memoization & hooks</span>
              </div>
              <div className="tech-item-row">
                <strong>Vite 8</strong>
                <span>Blazing-fast client bundling & HMR</span>
              </div>
              <div className="tech-item-row">
                <strong>Lucide React</strong>
                <span>SaaS iconography system</span>
              </div>
              <div className="tech-item-row">
                <strong>Recharts v3</strong>
                <span>Dynamic telemetry & simulation charts</span>
              </div>
              <div className="tech-item-row">
                <strong>Vanilla CSS</strong>
                <span>Custom design system with zero CSS framework bloat</span>
              </div>
            </div>
          </div>

          <div className="tech-category-card">
            <div className="tech-cat-header">
              <span className="tech-cat-title">Backend API & Security</span>
              <span className="tech-cat-count">4 Technologies</span>
            </div>
            <div className="tech-items-list">
              <div className="tech-item-row">
                <strong>Python 3.13</strong>
                <span>Modern typed asynchronous runtime</span>
              </div>
              <div className="tech-item-row">
                <strong>FastAPI</strong>
                <span>High-performance OpenAPI REST framework</span>
              </div>
              <div className="tech-item-row">
                <strong>Pydantic v2</strong>
                <span>Strict schema validation & serialization</span>
              </div>
              <div className="tech-item-row">
                <strong>Constant-Time Auth</strong>
                <span>Environment-isolated secrets.compare_digest</span>
              </div>
            </div>
          </div>

          <div className="tech-category-card">
            <div className="tech-cat-header">
              <span className="tech-cat-title">Machine Learning & Data</span>
              <span className="tech-cat-count">4 Components</span>
            </div>
            <div className="tech-items-list">
              <div className="tech-item-row">
                <strong>scikit-learn</strong>
                <span>Machine learning model evaluation</span>
              </div>
              <div className="tech-item-row">
                <strong>RandomForestRegressor</strong>
                <span>Ensemble regression for queue wait prediction</span>
              </div>
              <div className="tech-item-row">
                <strong>NumPy & Joblib</strong>
                <span>Array transformations & serialized pipeline</span>
              </div>
              <div className="tech-item-row">
                <strong>SQLite3 Engine</strong>
                <span>Relational storage with ACID transaction guarantees</span>
              </div>
            </div>
          </div>

          <div className="tech-category-card">
            <div className="tech-cat-header">
              <span className="tech-cat-title">Testing & Verification</span>
              <span className="tech-cat-count">3 Tools</span>
            </div>
            <div className="tech-items-list">
              <div className="tech-item-row">
                <strong>pytest 9</strong>
                <span>31 automated unit and integration tests</span>
              </div>
              <div className="tech-item-row">
                <strong>Starlette TestClient</strong>
                <span>Full HTTP lifecycle test coverage</span>
              </div>
              <div className="tech-item-row">
                <strong>Temporary SQLite Fixtures</strong>
                <span>Zero test side-effects on production data</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. HACKATHON ACHIEVEMENT SPOTLIGHT                                        */}
      {/* ========================================================================= */}
      <section className="showcase-section">
        <div className="achievement-spotlight-card">
          <div className="spotlight-badge-col">
            <div className="trophy-circle">
              <Trophy size={42} className="text-amber" />
            </div>
            <span className="spotlight-place-tag">3RD PLACE AWARD</span>
          </div>

          <div className="spotlight-content-col">
            <div className="spotlight-event-title">BuildX 0.1 Hackathon</div>
            <h3 className="spotlight-headline">
              Recognized for Practical AI Problem-Solving & Queue Innovation
            </h3>
            <p className="spotlight-narrative">
              FuelFlow AI was conceived and prototyped during the BuildX 0.1 Hackathon, earning 3rd Place among competing software engineering solutions. The prototype demonstrated how intelligent routing and pump scheduling algorithms could relieve crippling queue congestion along Sri Lankan highway corridors.
            </p>
            <div className="spotlight-highlights-row">
              <div className="spotlight-pill">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>Working End-to-End Prototype</span>
              </div>
              <div className="spotlight-pill">
                <CheckCircle2 size={14} className="text-cyan" />
                <span>Simulated Kegalle Corridor Scenario</span>
              </div>
              <div className="spotlight-pill">
                <CheckCircle2 size={14} className="text-amber" />
                <span>Demonstrable Peak Wait Reductions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. PROTOTYPE TRANSPARENCY & DISCLAIMERS                                   */}
      {/* ========================================================================= */}
      <section className="showcase-section">
        <div className="transparency-disclosure-card">
          <div className="disclosure-header">
            <AlertTriangle size={20} className="text-amber flex-shrink-0" />
            <div>
              <h3 className="disclosure-title">Prototype Scope & Simulation Boundaries</h3>
              <p className="disclosure-sub">
                Complete transparency regarding the prototype environment, data sources, and operational assumptions.
              </p>
            </div>
          </div>

          <div className="disclosure-grid">
            <div className="disclosure-item">
              <strong>Fictional Station Corridor</strong>
              <p>Stations A, B, and C represent synthetic station models along a simulated Kegalle corridor. They are not physical commercial stations.</p>
            </div>

            <div className="disclosure-item">
              <strong>Synthetic Training Data</strong>
              <p>The RandomForest machine learning model was trained on synthetic traffic distribution data designed to reflect realistic arrival patterns.</p>
            </div>

            <div className="disclosure-item">
              <strong>Virtual Queue Scope</strong>
              <p>Virtual queue registration saves genuine records in SQLite for demonstration; it does not reserve physical fuel or guarantee a place at a real fuel station.</p>
            </div>

            <div className="disclosure-item">
              <strong>No Live GPS or Refinery Feeds</strong>
              <p>Vehicle locations and fuel inventory levels are simulated; there is no live GPS device tracking or connection to Ceylon Petroleum Corporation refinery telemetry.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FINAL CALL TO ACTION                                                  */}
      {/* ========================================================================= */}
      <section className="showcase-section final-cta-section">
        <div className="final-cta-card">
          <div className="cta-icon-circle">
            <Fuel size={36} className="text-emerald" />
          </div>
          <h2 className="cta-title">Ready to Explore FuelFlow AI v1.1?</h2>
          <p className="cta-sub">
            Switch between the Driver and Manager portals to experience intelligent station discovery, digital virtual tickets, and discrete-event allocation in action.
          </p>

          <div className="final-cta-buttons">
            <button
              type="button"
              className="btn-showcase-primary large"
              onClick={() => onNavigate('driver')}
            >
              <Compass size={20} />
              <span>Launch Driver Portal</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn-showcase-secondary large"
              onClick={() => onNavigate('manager')}
            >
              <LayoutDashboard size={20} />
              <span>Launch Manager Portal</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
