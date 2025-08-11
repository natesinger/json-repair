import './MobileWarning.css'

const MobileWarning = () => {
  return (
    <div className="mobile-warning">
      <div className="mobile-warning-content">
        <div className="mobile-warning-icon">💻</div>
        <h2>Desktop Experience Required</h2>
        <p>
          This JSON repair tool is designed for desktop use and requires a larger screen 
          to provide the best experience.
        </p>
        <p>
          Please visit this page on a desktop computer or tablet with a screen width 
          of at least 768px.
        </p>
        <div className="mobile-warning-features">
          <div className="feature">
            <span className="feature-icon">📝</span>
            <span>Dual-pane editing</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔧</span>
            <span>Advanced formatting</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <span>Visual JSON tree</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileWarning 