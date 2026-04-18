function createScoreRing(score, containerEl) {
  if (!containerEl) return;
  
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let color = '#ff6584'; // rejected
  let status = 'REJECTED';
  if (score >= 80) {
    color = '#43e97b'; // approved
    status = 'APPROVED';
  } else if (score >= 50) {
    color = '#f9a825'; // improve
    status = 'IMPROVE';
  }

  containerEl.innerHTML = `
    <div class="score-ring-wrap">
      <svg class="score-ring-svg" width="70" height="70">
        <circle class="score-ring-bg" cx="35" cy="35" r="${radius}"></circle>
        <circle class="score-ring-fill" cx="35" cy="35" r="${radius}" 
          style="stroke: ${color}; stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};">
        </circle>
      </svg>
      <div class="score-ring-info">
        <div class="score-ring-label" style="color: ${color}">${score}<span class="score-ring-total">/100</span></div>
        <div class="badge badge-${status.toLowerCase()}" style="margin-top:4px">${status}</div>
        <div style="font-size:0.65rem; color:var(--text-muted); margin-top:4px">Nexus AI Score</div>
      </div>
    </div>
  `;

  // Animate the ring
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const fill = containerEl.querySelector('.score-ring-fill');
      if (fill) fill.style.strokeDashoffset = offset;
    });
  });
}

window.createScoreRing = createScoreRing;
