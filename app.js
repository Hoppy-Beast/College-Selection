/* ==========================================================================
   Bangladesh HSC College Selection - Editorial 2-Click Multi-Sort Edition (v4.3)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  let collegesData = [];
  let filteredData = [];
  let hasUserInteracted = false;

  // Pagination State
  let currentPage = 1;
  let entriesPerPage = 20;

  // General State
  const state = {
    searchQuery: '',
    board: 'ALL',
    district: 'ALL',
    thana: 'ALL',
    group: 'all'
  };

  // Multi-Sort Priority List (Default EMPTY - no sorting applied until user clicks!)
  let activeSorts = [];

  const availableSorts = [
    { key: 'gpa5_rate', label: 'Average GPA-5 Rate (%)', dir: 'desc' },
    { key: 'gpa5_count', label: 'GPA-5 Total Count', dir: 'desc' },
    { key: 'pass_rate', label: 'Pass Rate (%)', dir: 'desc' },
    { key: 'total_examinees', label: 'Total Examinees', dir: 'desc' },
    { key: 'science_gpa5', label: 'Science GPA-5', dir: 'desc' },
    { key: 'commerce_gpa5', label: 'Commerce GPA-5', dir: 'desc' },
    { key: 'arts_gpa5', label: 'Arts GPA-5', dir: 'desc' },
    { key: 'name', label: 'Name (A-Z)', dir: 'asc' }
  ];

  // DOM References
  const welcomeSection = document.getElementById('welcomeSection');
  const collegesContainer = document.getElementById('collegesContainer');
  const btnExplore = document.getElementById('btnExplore');

  const searchInput = document.getElementById('searchInput');
  const boardFilter = document.getElementById('boardFilter');
  const districtFilter = document.getElementById('districtFilter');
  const thanaFilter = document.getElementById('thanaFilter');
  const entriesPerPageSelect = document.getElementById('entriesPerPage');
  const multiSortChips = document.getElementById('multiSortChips');
  const resetSortBtn = document.getElementById('resetSortBtn');

  const collegesGrid = document.getElementById('collegesGrid');
  const visibleCount = document.getElementById('visibleCount');
  const groupTabs = document.querySelectorAll('.tab-btn');

  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');

  const detailModal = document.getElementById('detailModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalBody = document.getElementById('modalBody');

  function debounce(func, wait = 150) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  init();

  async function init() {
    try {
      showLoadingState();

      const dataUrl = './data/colleges.json';
      const response = await fetch(dataUrl);

      if (!response.ok) {
        throw new Error(`Failed to load dataset (${response.status} ${response.statusText})`);
      }
      collegesData = await response.json();

      collegesData.forEach(c => {
        const appeared = c.appeared || c.total_examinees || 1;
        const gpa5 = c.gpa5_count || 0;
        c.avg_gpa5_rate = parseFloat(((gpa5 / appeared) * 100).toFixed(2));
      });

      populateDistricts();
      renderMultiSortChips();
      setupEventListeners();
    } catch (error) {
      console.error('Initialization error:', error);
      showErrorState(error.message);
    }
  }

  function populateDistricts() {
    const activeBoard = state.board;
    let relevant = collegesData;
    if (activeBoard !== 'ALL') {
      relevant = collegesData.filter(c => c.board === activeBoard);
    }

    const districts = setSortedUnique(relevant.map(c => c.district));
    
    districtFilter.innerHTML = '<option value="ALL">All Districts (Select to Filter)</option>';
    const fragment = document.createDocumentFragment();
    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      fragment.appendChild(opt);
    });
    districtFilter.appendChild(fragment);

    populateThanas();
  }

  function populateThanas() {
    const activeBoard = state.board;
    const activeDistrict = state.district;

    let relevant = collegesData;
    if (activeBoard !== 'ALL') {
      relevant = relevant.filter(c => c.board === activeBoard);
    }
    if (activeDistrict !== 'ALL') {
      relevant = relevant.filter(c => c.district.toUpperCase() === activeDistrict.toUpperCase());
    }

    const thanas = setSortedUnique(relevant.map(c => c.thana));

    thanaFilter.innerHTML = '<option value="ALL">All Thanas</option>';
    const fragment = document.createDocumentFragment();
    thanas.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      fragment.appendChild(opt);
    });
    thanaFilter.appendChild(fragment);
  }

  function setSortedUnique(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function setupEventListeners() {
    btnExplore.addEventListener('click', () => {
      userInteract();
    });

    const debouncedSearch = debounce((val) => {
      state.searchQuery = val.trim().toLowerCase();
      currentPage = 1;
      userInteract();
    }, 150);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });

    boardFilter.addEventListener('change', (e) => {
      state.board = e.target.value;
      state.district = 'ALL';
      state.thana = 'ALL';
      currentPage = 1;
      populateDistricts();
      userInteract();
    });

    districtFilter.addEventListener('change', (e) => {
      state.district = e.target.value;
      state.thana = 'ALL';
      currentPage = 1;
      populateThanas();
      userInteract();
    });

    thanaFilter.addEventListener('change', (e) => {
      state.thana = e.target.value;
      currentPage = 1;
      userInteract();
    });

    entriesPerPageSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      entriesPerPage = val === 'ALL' ? 'ALL' : parseInt(val, 10);
      currentPage = 1;
      if (hasUserInteracted) applyFiltersAndRender();
    });

    groupTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        groupTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.group = tab.dataset.group;
        currentPage = 1;
        if (hasUserInteracted) applyFiltersAndRender();
      });
    });

    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        applyFiltersAndRender();
        scrollToTopGrid();
      }
    });

    nextPageBtn.addEventListener('click', () => {
      const totalPages = getTotalPages();
      if (currentPage < totalPages) {
        currentPage++;
        applyFiltersAndRender();
        scrollToTopGrid();
      }
    });

    // RESET PRIORITY BUTTON: Clears all active sort priorities to []
    resetSortBtn.addEventListener('click', () => {
      activeSorts = [];
      renderMultiSortChips();
      if (hasUserInteracted) applyFiltersAndRender();
    });

    modalClose.addEventListener('click', closeModal);
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function userInteract() {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      welcomeSection.style.display = 'none';
      collegesContainer.style.display = 'block';
    }
    applyFiltersAndRender();
  }

  function scrollToTopGrid() {
    collegesContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // 2-CLICK MULTI-SORT PILL TOGGLE ENGINE (ON / OFF)
  function renderMultiSortChips() {
    multiSortChips.innerHTML = availableSorts.map(sortObj => {
      const activeIndex = activeSorts.findIndex(s => s.key === sortObj.key);
      const isActive = activeIndex !== -1;

      return `
        <button type="button" class="sort-pill ${isActive ? 'active' : ''}" data-key="${sortObj.key}">
          ${isActive ? `<span class="priority-tag">${activeIndex + 1}</span>` : ''}
          <span>${sortObj.label}</span>
          <span class="sort-status-dot">${isActive ? 'ON' : 'OFF'}</span>
        </button>
      `;
    }).join('');

    document.querySelectorAll('.sort-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const key = pill.dataset.key;
        const activeIndex = activeSorts.findIndex(s => s.key === key);

        if (activeIndex !== -1) {
          // CLICK 2: Turn OFF (Remove from priority list)
          activeSorts.splice(activeIndex, 1);
        } else {
          // CLICK 1: Turn ON (Add to priority list)
          const meta = availableSorts.find(s => s.key === key);
          activeSorts.push({ key: meta.key, label: meta.label, dir: meta.dir });
        }

        renderMultiSortChips();
        if (hasUserInteracted) applyFiltersAndRender();
      });
    });
  }

  function applyFiltersAndRender() {
    // Clone array to prevent mutating master dataset
    let result = [...collegesData];

    if (state.board !== 'ALL') {
      result = result.filter(c => c.board === state.board);
    }

    if (state.district !== 'ALL') {
      result = result.filter(c => c.district.toUpperCase() === state.district.toUpperCase());
    }

    if (state.thana !== 'ALL') {
      result = result.filter(c => c.thana.toUpperCase() === state.thana.toUpperCase());
    }

    if (state.searchQuery) {
      const q = state.searchQuery;
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.eiin.includes(q) ||
        c.code.includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.thana.toLowerCase().includes(q)
      );
    }

    // Apply Multi-Sort Comparator ONLY if activeSorts is non-empty!
    if (activeSorts.length > 0) {
      result.sort((a, b) => {
        for (const sortObj of activeSorts) {
          let valA = getSortValue(a, sortObj.key, state.group);
          let valB = getSortValue(b, sortObj.key, state.group);

          if (typeof valA === 'string') {
            const comp = valA.localeCompare(valB);
            if (comp !== 0) return sortObj.dir === 'asc' ? comp : -comp;
          } else {
            if (valA !== valB) {
              return sortObj.dir === 'desc' ? (valB - valA) : (valA - valB);
            }
          }
        }
        return 0;
      });
    }

    filteredData = result;
    visibleCount.textContent = filteredData.length.toLocaleString();

    updatePaginationUI();
    renderCards(getCurrentPageBatch());
  }

  function getSortValue(college, key, selectedGroup) {
    if (key === 'name') return college.name;
    if (key === 'total_examinees') return college.total_examinees;
    if (key === 'pass_rate') return college.pass_rate;
    if (key === 'gpa5_count') return college.gpa5_count;
    if (key === 'gpa5_rate') return college.avg_gpa5_rate || college.gpa5_rate;

    if (key === 'science_gpa5') return college.groups.science ? college.groups.science.gpa5 : 0;
    if (key === 'commerce_gpa5') return college.groups.commerce ? college.groups.commerce.gpa5 : 0;
    if (key === 'arts_gpa5') return college.groups.humanities ? college.groups.humanities.gpa5 : 0;

    return 0;
  }

  function getTotalPages() {
    if (entriesPerPage === 'ALL' || filteredData.length === 0) return 1;
    return Math.ceil(filteredData.length / entriesPerPage);
  }

  function getCurrentPageBatch() {
    if (entriesPerPage === 'ALL') return filteredData;
    const start = (currentPage - 1) * entriesPerPage;
    return filteredData.slice(start, start + entriesPerPage);
  }

  function updatePaginationUI() {
    const totalPages = getTotalPages();
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    prevPageBtn.disabled = (currentPage <= 1);
    nextPageBtn.disabled = (currentPage >= totalPages);
  }

  function renderCards(batch) {
    if (batch.length === 0) {
      collegesGrid.innerHTML = `
        <div class="no-results">
          <h3>No Colleges Found</h3>
          <p>Try adjusting your search query, district filter, or board selection.</p>
        </div>
      `;
      return;
    }

    const startRank = entriesPerPage === 'ALL' ? 1 : ((currentPage - 1) * entriesPerPage + 1);

    const html = batch.map((college, idx) => {
      const rank = startRank + idx;
      const rankLabel = rank <= 3 ? `#${rank}` : `#${rank}`;
      
      const sc = college.groups.science || { total: 0, passed: 0, gpa5: 0, pass_rate: 0 };
      const cm = college.groups.commerce || { total: 0, passed: 0, gpa5: 0, pass_rate: 0 };
      const hu = college.groups.humanities || { total: 0, passed: 0, gpa5: 0, pass_rate: 0 };

      const scPassed = sc.passed !== undefined ? sc.passed : Math.round((sc.total || 0) * (sc.pass_rate / 100));
      const cmPassed = cm.passed !== undefined ? cm.passed : Math.round((cm.total || 0) * (cm.pass_rate / 100));
      const huPassed = hu.passed !== undefined ? hu.passed : Math.round((hu.total || 0) * (hu.pass_rate / 100));

      const scFail = Math.max(0, (sc.total || 0) - scPassed);
      const cmFail = Math.max(0, (cm.total || 0) - cmPassed);
      const huFail = Math.max(0, (hu.total || 0) - huPassed);

      const avgGpa5Rate = college.avg_gpa5_rate || college.gpa5_rate || 0;

      return `
        <article class="college-card" data-rank="${rank}">
          <div>
            <div class="card-top">
              <div>
                <h3 class="college-name">${escapeHTML(college.name)}</h3>
                <div class="location-info">
                  ${escapeHTML(college.thana)}, ${escapeHTML(college.district)} (${college.board})
                </div>
                <span class="eiin-tag">EIIN: ${college.eiin} | Code: ${college.code}</span>
              </div>
              <div class="rank-badge">${rankLabel}</div>
            </div>

            <!-- KEY METRICS OVERVIEW -->
            <div class="metrics-row">
              <div class="metric-item">
                <div class="metric-value">${college.total_examinees}</div>
                <div class="metric-label">Total Examinees</div>
              </div>
              <div class="metric-item highlight-center">
                <div class="metric-value pass-color">${college.pass_rate}%</div>
                <div class="metric-label">Total Pass Rate</div>
              </div>
              <div class="metric-item">
                <div class="metric-value gpa5-color">${college.passed}</div>
                <div class="metric-label">Total Passed</div>
              </div>
            </div>

            <!-- AVERAGE GPA-5 RATE PROGRESS BAR -->
            <div class="progress-container">
              <div class="progress-header">
                <span>Average GPA-5 Rate (All Subjects)</span>
                <span>${avgGpa5Rate}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${Math.min(100, avgGpa5Rate)}%;"></div>
              </div>
            </div>

            <!-- SUBJECT STREAM MINI BOXES -->
            <div class="stream-mini-grid">
              <div class="stream-mini-box">
                <div class="stream-title">SCIENCE</div>
                <div class="stream-stats">
                  <span>Pass: <strong>${scPassed}</strong> (${sc.pass_rate}%)</span>
                  <span>GPA 5: <strong class="gpa-txt">${sc.gpa5}</strong></span>
                  <span>Fail: <strong class="fail-txt">${scFail}</strong></span>
                </div>
              </div>

              <div class="stream-mini-box">
                <div class="stream-title">COMMERCE</div>
                <div class="stream-stats">
                  <span>Pass: <strong>${cmPassed}</strong> (${cm.pass_rate}%)</span>
                  <span>GPA 5: <strong class="gpa-txt">${cm.gpa5}</strong></span>
                  <span>Fail: <strong class="fail-txt">${cmFail}</strong></span>
                </div>
              </div>

              <div class="stream-mini-box">
                <div class="stream-title">ARTS</div>
                <div class="stream-stats">
                  <span>Pass: <strong>${huPassed}</strong> (${hu.pass_rate}%)</span>
                  <span>GPA 5: <strong class="gpa-txt">${hu.gpa5}</strong></span>
                  <span>Fail: <strong class="fail-txt">${huFail}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <button class="btn-details" data-eiin="${college.eiin}">
            <span>View Full Details Report</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </article>
      `;
    }).join('');

    window.requestAnimationFrame(() => {
      collegesGrid.innerHTML = html;

      document.querySelectorAll('.btn-details[data-eiin]').forEach(btn => {
        btn.addEventListener('click', () => {
          const eiin = btn.dataset.eiin;
          const college = collegesData.find(c => c.eiin === eiin);
          if (college) openModal(college);
        });
      });
    });
  }

  function openModal(college) {
    modalTitle.textContent = college.name;
    modalSubtitle.textContent = `EIIN: ${college.eiin} | Code: ${college.code} | Board: ${college.board}`;

    const sc = college.groups.science || { total: 0, passed: 0, pass_rate: 0, gpa5: 0 };
    const cm = college.groups.commerce || { total: 0, passed: 0, pass_rate: 0, gpa5: 0 };
    const hu = college.groups.humanities || { total: 0, passed: 0, pass_rate: 0, gpa5: 0 };

    const scPassed = sc.passed !== undefined ? sc.passed : Math.round((sc.total || 0) * (sc.pass_rate / 100));
    const cmPassed = cm.passed !== undefined ? cm.passed : Math.round((cm.total || 0) * (cm.pass_rate / 100));
    const huPassed = hu.passed !== undefined ? hu.passed : Math.round((hu.total || 0) * (hu.pass_rate / 100));

    const scFail = Math.max(0, (sc.total || 0) - scPassed);
    const cmFail = Math.max(0, (cm.total || 0) - cmPassed);
    const huFail = Math.max(0, (hu.total || 0) - huPassed);

    const centreText = college.centre ? college.centre : `${college.thana} CENTRE`;
    const appearedVal = college.appeared ? college.appeared : college.total_examinees;
    const avgGpa5Rate = college.avg_gpa5_rate || college.gpa5_rate || 0;

    modalBody.innerHTML = `
      <div class="modal-info-banner">
        <div class="banner-row">
          <span class="banner-label">INSTITUTION:</span>
          <span class="banner-val highlight-name">${college.name} (EIIN: ${college.eiin})</span>
        </div>
        <div class="banner-row">
          <span class="banner-label">CENTRE:</span>
          <span class="banner-val">${centreText}, THANA: ${college.thana}, ZILLA: ${college.district}</span>
        </div>
      </div>

      <h4 class="modal-section-title">Academic Performance Analytics</h4>
      <div class="modal-dashboard-grid">
        <div class="dash-card">
          <span class="dash-label">Total Examinees</span>
          <span class="dash-val">${college.total_examinees.toLocaleString()}</span>
          <span class="dash-sub">Appeared: ${appearedVal.toLocaleString()}</span>
        </div>
        <div class="dash-card">
          <span class="dash-label">Total Passed</span>
          <span class="dash-val pass-txt">${college.passed.toLocaleString()}</span>
          <span class="dash-sub fail-txt">Failed: ${college.failed}</span>
        </div>
        <div class="dash-card highlight-cyan">
          <span class="dash-label">Percentage of Pass</span>
          <span class="dash-val cyan-txt">${college.pass_rate.toFixed(2)}%</span>
          <span class="dash-sub">Pass Percentage</span>
        </div>
        <div class="dash-card highlight-emerald">
          <span class="dash-label">Average GPA-5 Rate</span>
          <span class="dash-val emerald-txt">${avgGpa5Rate.toFixed(2)}%</span>
          <span class="dash-sub">Total GPA 5: ${college.gpa5_count}</span>
        </div>
      </div>

      <h4 class="modal-section-title">Academic Stream Detailed Breakdown</h4>
      <div class="modal-stream-grid">
        <div class="modal-stream-card">
          <div class="stream-card-header sc-border">
            <h5>SCIENCE STREAM</h5>
            <span class="stream-total-tag">${sc.total || 0} Students</span>
          </div>
          <div class="stream-metric-list">
            <div class="s-metric">
              <span>Passed Students:</span>
              <strong class="cyan-txt">${scPassed} (${sc.pass_rate}%)</strong>
            </div>
            <div class="s-metric">
              <span>GPA 5 (A+):</span>
              <strong class="emerald-txt">${sc.gpa5}</strong>
            </div>
            <div class="s-metric">
              <span>Failed Students:</span>
              <strong class="fail-txt">${scFail}</strong>
            </div>
          </div>
        </div>

        <div class="modal-stream-card">
          <div class="stream-card-header cm-border">
            <h5>BUSINESS STUDIES (COMMERCE)</h5>
            <span class="stream-total-tag">${cm.total || 0} Students</span>
          </div>
          <div class="stream-metric-list">
            <div class="s-metric">
              <span>Passed Students:</span>
              <strong class="cyan-txt">${cmPassed} (${cm.pass_rate}%)</strong>
            </div>
            <div class="s-metric">
              <span>GPA 5 (A+):</span>
              <strong class="emerald-txt">${cm.gpa5}</strong>
            </div>
            <div class="s-metric">
              <span>Failed Students:</span>
              <strong class="fail-txt">${cmFail}</strong>
            </div>
          </div>
        </div>

        <div class="modal-stream-card">
          <div class="stream-card-header hu-border">
            <h5>HUMANITIES (ARTS)</h5>
            <span class="stream-total-tag">${hu.total || 0} Students</span>
          </div>
          <div class="stream-metric-list">
            <div class="s-metric">
              <span>Passed Students:</span>
              <strong class="cyan-txt">${huPassed} (${hu.pass_rate}%)</strong>
            </div>
            <div class="s-metric">
              <span>GPA 5 (A+):</span>
              <strong class="emerald-txt">${hu.gpa5}</strong>
            </div>
            <div class="s-metric">
              <span>Failed Students:</span>
              <strong class="fail-txt">${huFail}</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    detailModal.classList.add('active');
    detailModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    detailModal.classList.remove('active');
    detailModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showLoadingState() {
    collegesGrid.innerHTML = `
      <div class="no-results">
        <p>Loading official Education Board result analytics data...</p>
      </div>
    `;
  }

  function showErrorState(msg) {
    collegesGrid.innerHTML = `
      <div class="no-results" style="color: var(--accent-red);">
        <h3>Error Loading Dataset</h3>
        <p>${escapeHTML(msg)}</p>
      </div>
    `;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => {
      const escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escape[match];
    });
  }
});
