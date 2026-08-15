/* ==========================================================================
   Bangladesh HSC College Selection Guide & Dhaka Board XI Seat Finder (v5.0)
   Designed & Developed by MD. Mahinur Rahman Prachurza (Prachurza)
   In Collaboration with Fahad's Tutorial (FT)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // SHARED & MODE SWITCHER STATE
  // =========================================================================
  let currentPortalMode = 'all-boards'; // 'all-boards' | 'dhaka-special'

  const tabAllBoards = document.getElementById('tabAllBoards');
  const tabDhakaSpecial = document.getElementById('tabDhakaSpecial');
  const allBoardsSection = document.getElementById('allBoardsSection');
  const dhakaSection = document.getElementById('dhakaSection');
  const btnExploreDhakaHero = document.getElementById('btnExploreDhakaHero');

  // Debounce helper
  function debounce(func, wait = 150) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, match => {
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

  function setSortedUnique(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  // Switch Portal View
  function switchPortalMode(mode) {
    currentPortalMode = mode;
    if (mode === 'all-boards') {
      tabAllBoards.classList.add('active');
      tabDhakaSpecial.classList.remove('active');
      allBoardsSection.style.display = 'block';
      dhakaSection.style.display = 'none';
    } else {
      tabDhakaSpecial.classList.add('active');
      tabAllBoards.classList.remove('active');
      dhakaSection.style.display = 'block';
      allBoardsSection.style.display = 'none';
      initDhakaSection();
    }
  }

  tabAllBoards.addEventListener('click', () => switchPortalMode('all-boards'));
  tabDhakaSpecial.addEventListener('click', () => switchPortalMode('dhaka-special'));

  if (btnExploreDhakaHero) {
    btnExploreDhakaHero.addEventListener('click', () => {
      switchPortalMode('dhaka-special');
      dhakaSection.scrollIntoView({ behavior: 'smooth' });
    });
  }


  // =========================================================================
  // MODULE 1: ALL BOARDS HSC ACADEMIC PERFORMANCE GUIDE (ON-DEMAND CHUNK LOADER)
  // =========================================================================
  let collegesData = [];
  let filteredData = [];
  let hasUserInteracted = false;

  // Cache loaded board chunks in memory to avoid repeated network requests
  const boardCache = {};
  let isLoadingBoard = false;

  // Pagination State
  let currentPage = 1;
  let entriesPerPage = 20;

  // General State - Starts with NONE so zero unnecessary bytes are loaded upfront!
  const state = {
    searchQuery: '',
    board: 'NONE',
    district: 'ALL',
    thana: 'ALL',
    group: 'all'
  };

  // Multi-Sort Priority List (Default EMPTY - no sorting applied until user clicks!)
  let activeSorts = [];

  const availableSorts = [
    { key: 'gpa5_rate', label: 'Average GPA-5 Rate (%)', defaultDir: 'desc' },
    { key: 'gpa5_count', label: 'GPA-5 Total Count', defaultDir: 'desc' },
    { key: 'pass_rate', label: 'Pass Rate (%)', defaultDir: 'desc' },
    { key: 'total_examinees', label: 'Total Examinees', defaultDir: 'desc' },
    { key: 'science_gpa5', label: 'Science GPA-5', defaultDir: 'desc' },
    { key: 'commerce_gpa5', label: 'Commerce GPA-5', defaultDir: 'desc' },
    { key: 'arts_gpa5', label: 'Arts GPA-5', defaultDir: 'desc' },
    { key: 'name', label: 'College Name', defaultDir: 'asc' }
  ];

  const sortPresets = {
    excellence: [
      { key: 'gpa5_rate', dir: 'desc' },
      { key: 'gpa5_count', dir: 'desc' },
      { key: 'pass_rate', dir: 'desc' }
    ],
    pass_leaders: [
      { key: 'pass_rate', dir: 'desc' },
      { key: 'gpa5_count', dir: 'desc' },
      { key: 'total_examinees', dir: 'desc' }
    ],
    large_colleges: [
      { key: 'total_examinees', dir: 'desc' },
      { key: 'gpa5_count', dir: 'desc' },
      { key: 'pass_rate', dir: 'desc' }
    ],
    science_power: [
      { key: 'science_gpa5', dir: 'desc' },
      { key: 'gpa5_rate', dir: 'desc' },
      { key: 'pass_rate', dir: 'desc' }
    ]
  };

  // DOM References (All Boards)
  const welcomeSection = document.getElementById('welcomeSection');
  const collegesContainer = document.getElementById('collegesContainer');
  const btnExplore = document.getElementById('btnExplore');

  const searchInput = document.getElementById('searchInput');
  const boardFilter = document.getElementById('boardFilter');
  const boardQuickChips = document.querySelectorAll('#boardQuickChips .board-chip-btn');
  const districtFilter = document.getElementById('districtFilter');
  const thanaFilter = document.getElementById('thanaFilter');
  const entriesPerPageSelect = document.getElementById('entriesPerPage');
  const multiSortChips = document.getElementById('multiSortChips');
  const activeSortPipeline = document.getElementById('activeSortPipeline');
  const resetSortBtn = document.getElementById('resetSortBtn');
  const sortPresetButtons = document.querySelectorAll('.btn-sort-preset');

  const collegesGrid = document.getElementById('collegesGrid');
  const visibleCount = document.getElementById('visibleCount');
  const groupTabs = document.querySelectorAll('#allBoardsSection .group-tabs .tab-btn');

  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');

  const detailModal = document.getElementById('detailModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalBody = document.getElementById('modalBody');

  initAllBoards();

  function initAllBoards() {
    renderMultiSortChips();
    setupAllBoardsEventListeners();
    populateDistricts();
    updateBoardQuickChipsUI();
    renderSelectBoardPrompt();
  }

  async function loadBoardData(boardKey) {
    updateBoardQuickChipsUI();

    if (boardKey === 'NONE') {
      collegesData = [];
      filteredData = [];
      visibleCount.textContent = '0';
      populateDistricts();
      renderSelectBoardPrompt();
      return;
    }

    if (boardCache[boardKey]) {
      setLoadedCollegesData(boardCache[boardKey]);
      return;
    }

    try {
      isLoadingBoard = true;
      showLoadingState(boardKey);

      let dataUrl = '';
      if (boardKey === 'ALL') {
        dataUrl = './data/colleges.json';
      } else {
        dataUrl = `./data/boards/${boardKey.toLowerCase()}.json`;
      }

      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to load data for ${boardKey} (${response.status} ${response.statusText})`);
      }

      let rawData = await response.json();

      // Hardcoded Exclusion: Never display Hermann Gmeiner / EIIN 108215
      rawData = rawData.filter(c => {
        if (!c) return false;
        const eiin = String(c.eiin || '').trim();
        const name = String(c.name || '').toUpperCase();
        if (eiin === '108215' || name.includes('HERMANN') || name.includes('GMEINER')) {
          return false;
        }
        return true;
      });

      rawData.forEach(c => {
        const appeared = c.appeared || c.total_examinees || 1;
        const gpa5 = c.gpa5_count || 0;
        c.avg_gpa5_rate = parseFloat(((gpa5 / appeared) * 100).toFixed(2));
      });

      boardCache[boardKey] = rawData;
      setLoadedCollegesData(rawData);
    } catch (error) {
      console.error(`Error loading board ${boardKey}:`, error);
      showErrorState(error.message);
    } finally {
      isLoadingBoard = false;
    }
  }

  function setLoadedCollegesData(data) {
    collegesData = data;
    populateDistricts();
    applyFiltersAndRender();
  }

  function updateBoardQuickChipsUI() {
    boardQuickChips.forEach(btn => {
      if (btn.dataset.board === state.board) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderSelectBoardPrompt() {
    collegesGrid.innerHTML = `
      <div class="no-results select-board-prompt">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-emerald); margin-bottom: 12px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        <h3>Please Select an Education Board</h3>
        <p>Choose your Education Board from the options above to view colleges and ranking analytics.</p>
      </div>
    `;
  }

  function populateDistricts() {
    const activeBoard = state.board;
    if (activeBoard === 'NONE') {
      districtFilter.innerHTML = '<option value="ALL">Select Board First</option>';
      thanaFilter.innerHTML = '<option value="ALL">Select District First</option>';
      districtFilter.disabled = true;
      thanaFilter.disabled = true;
      return;
    }

    districtFilter.disabled = false;
    thanaFilter.disabled = false;

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

    if (activeBoard === 'NONE') {
      thanaFilter.innerHTML = '<option value="ALL">All Thanas</option>';
      return;
    }

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

  function setupAllBoardsEventListeners() {
    btnExplore.addEventListener('click', () => {
      userInteract();
    });

    const debouncedSearch = debounce((val) => {
      state.searchQuery = val.trim().toLowerCase();
      currentPage = 1;
      userInteract();
      if (state.board === 'NONE' && state.searchQuery) {
        state.board = 'ALL';
        boardFilter.value = 'ALL';
        loadBoardData('ALL');
      } else {
        applyFiltersAndRender();
      }
    }, 150);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });

    boardFilter.addEventListener('change', (e) => {
      const selected = e.target.value;
      state.board = selected;
      state.district = 'ALL';
      state.thana = 'ALL';
      currentPage = 1;
      updateBoardQuickChipsUI();
      userInteract();
      loadBoardData(selected);
    });

    boardQuickChips.forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.dataset.board;
        state.board = selected;
        boardFilter.value = selected;
        state.district = 'ALL';
        state.thana = 'ALL';
        currentPage = 1;
        updateBoardQuickChipsUI();
        userInteract();
        loadBoardData(selected);
      });
    });

    districtFilter.addEventListener('change', (e) => {
      state.district = e.target.value;
      state.thana = 'ALL';
      currentPage = 1;
      populateThanas();
      userInteract();
      applyFiltersAndRender();
    });

    thanaFilter.addEventListener('change', (e) => {
      state.thana = e.target.value;
      currentPage = 1;
      userInteract();
      applyFiltersAndRender();
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

    resetSortBtn.addEventListener('click', () => {
      activeSorts = [];
      renderMultiSortChips();
      if (hasUserInteracted) applyFiltersAndRender();
    });

    setupSortPresetListeners();

    modalClose.addEventListener('click', closeModal);
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeDhakaModal();
      }
    });
  }

  function userInteract() {
    if (!hasUserInteracted) {
      hasUserInteracted = true;
      welcomeSection.style.display = 'none';
      collegesContainer.style.display = 'block';
    }
    if (state.board === 'NONE') {
      renderBoardGateway();
    } else {
      applyFiltersAndRender();
    }
  }

  function scrollToTopGrid() {
    collegesContainer.scrollIntoView({ behavior: 'smooth' });
  }

  // ENHANCED MULTI-SORT PRIORITY PIPELINE ENGINE
  function renderMultiSortChips() {
    renderActiveSortPipeline();
    updateSortPresetButtons();

    multiSortChips.innerHTML = availableSorts.map(sortObj => {
      const activeIndex = activeSorts.findIndex(s => s.key === sortObj.key);
      const isActive = activeIndex !== -1;
      const activeItem = isActive ? activeSorts[activeIndex] : null;
      const dirText = activeItem ? (activeItem.dir === 'desc' ? 'High &darr;' : 'Low &uarr;') : '';

      return `
        <button type="button" class="sort-pill ${isActive ? 'active' : ''}" data-key="${sortObj.key}" title="${isActive ? 'Click to toggle direction or remove' : 'Click to add priority'}">
          ${isActive ? `<span class="priority-tag">${activeIndex + 1}</span>` : ''}
          <span>${sortObj.label}</span>
          ${isActive ? `<span class="sort-dir-icon">${dirText}</span>` : ''}
          <span class="sort-status-dot">${isActive ? 'ON' : 'OFF'}</span>
        </button>
      `;
    }).join('');

    document.querySelectorAll('#allBoardsSection .sort-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const key = pill.dataset.key;
        const meta = availableSorts.find(s => s.key === key);
        const activeIndex = activeSorts.findIndex(s => s.key === key);

        if (activeIndex === -1) {
          // 1st click: Activate with default direction
          activeSorts.push({
            key: meta.key,
            label: meta.label,
            dir: meta.defaultDir,
            defaultDir: meta.defaultDir
          });
        } else {
          const current = activeSorts[activeIndex];
          if (current.dir === current.defaultDir) {
            // 2nd click: Toggle direction
            current.dir = current.dir === 'desc' ? 'asc' : 'desc';
          } else {
            // 3rd click: Deactivate & remove
            activeSorts.splice(activeIndex, 1);
          }
        }

        renderMultiSortChips();
        if (hasUserInteracted) {
          if (state.board === 'NONE') {
            state.board = 'ALL';
            boardFilter.value = 'ALL';
            loadBoardData('ALL');
          } else {
            applyFiltersAndRender();
          }
        }
      });
    });
  }

  function renderActiveSortPipeline() {
    if (!activeSortPipeline) return;

    if (activeSorts.length === 0) {
      activeSortPipeline.innerHTML = `
        <span class="pipeline-empty-hint">
          No sort priority active. Catalog ordered by official board rank. Click any metric below to add priority.
        </span>
      `;
      return;
    }

    const itemsHtml = activeSorts.map((sortObj, idx) => {
      const dirLabel = sortObj.dir === 'desc' ? 'High &darr;' : 'Low &uarr;';
      return `
        <div class="pipeline-item">
          <span class="pipeline-badge">${idx + 1}</span>
          <span>${escapeHTML(sortObj.label)}</span>
          <span class="pipeline-dir">${dirLabel}</span>
          <button type="button" class="pipeline-remove" data-remove-key="${sortObj.key}" title="Remove this priority">&times;</button>
        </div>
        ${idx < activeSorts.length - 1 ? '<span class="pipeline-arrow">&rarr;</span>' : ''}
      `;
    }).join('');

    activeSortPipeline.innerHTML = itemsHtml;

    activeSortPipeline.querySelectorAll('.pipeline-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.removeKey;
        const idx = activeSorts.findIndex(s => s.key === key);
        if (idx !== -1) {
          activeSorts.splice(idx, 1);
          renderMultiSortChips();
          if (hasUserInteracted) {
            if (state.board !== 'NONE') applyFiltersAndRender();
          }
        }
      });
    });
  }

  function updateSortPresetButtons() {
    sortPresetButtons.forEach(btn => {
      const presetKey = btn.dataset.preset;
      const targetPreset = sortPresets[presetKey];
      if (!targetPreset) return;

      const isMatch = targetPreset.length === activeSorts.length &&
        targetPreset.every((p, i) => activeSorts[i] && activeSorts[i].key === p.key && activeSorts[i].dir === p.dir);

      if (isMatch) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function setupSortPresetListeners() {
    sortPresetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        const targetPreset = sortPresets[presetKey];
        if (!targetPreset) return;

        activeSorts = targetPreset.map(p => {
          const meta = availableSorts.find(s => s.key === p.key);
          return {
            key: p.key,
            label: meta.label,
            dir: p.dir,
            defaultDir: meta.defaultDir
          };
        });

        renderMultiSortChips();
        if (state.board === 'NONE') {
          state.board = 'ALL';
          boardFilter.value = 'ALL';
          userInteract();
          loadBoardData('ALL');
        } else {
          userInteract();
        }
      });
    });
  }

  function applyFiltersAndRender() {
    if (state.board === 'NONE') {
      renderBoardGateway();
      return;
    }

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
        String(c.eiin).includes(q) ||
        String(c.code).includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.thana.toLowerCase().includes(q)
      );
    }

    // MULTI-SORT PRIORITY COMPARATOR WITH PRECISION TIE-BREAKING
    if (activeSorts.length > 0) {
      result.sort((a, b) => {
        for (const sortObj of activeSorts) {
          const valA = getSortValue(a, sortObj.key, state.group);
          const valB = getSortValue(b, sortObj.key, state.group);

          if (typeof valA === 'string') {
            const comp = valA.localeCompare(valB);
            if (comp !== 0) return sortObj.dir === 'asc' ? comp : -comp;
          } else {
            // Precision numerical comparison (rounded to 2 decimal places for percentage rates)
            const numA = Math.round(Number(valA || 0) * 100);
            const numB = Math.round(Number(valB || 0) * 100);
            if (numA !== numB) {
              return sortObj.dir === 'desc' ? (numB - numA) : (numA - numB);
            }
          }
        }
        // Deterministic tie-breaker
        return (a.rank || 0) - (b.rank || 0) || a.name.localeCompare(b.name);
      });
    }

    filteredData = result;
    visibleCount.textContent = filteredData.length.toLocaleString();

    updatePaginationUI();
    renderCards(getCurrentPageBatch());
  }

  function getSortValue(college, key, selectedGroup) {
    const grp = selectedGroup || state.group || 'all';

    if (key === 'name') return college.name;
    if (key === 'total_examinees') return college.total_examinees || 0;

    if (key === 'pass_rate') {
      if (grp === 'science' && college.groups && college.groups.science && college.groups.science.total > 0) {
        return college.groups.science.pass_rate || 0;
      }
      if (grp === 'commerce' && college.groups && college.groups.commerce && college.groups.commerce.total > 0) {
        return college.groups.commerce.pass_rate || 0;
      }
      if (grp === 'humanities' && college.groups && college.groups.humanities && college.groups.humanities.total > 0) {
        return college.groups.humanities.pass_rate || 0;
      }
      return college.pass_rate || 0;
    }

    if (key === 'gpa5_count') {
      if (grp === 'science' && college.groups && college.groups.science) {
        return college.groups.science.gpa5 || 0;
      }
      if (grp === 'commerce' && college.groups && college.groups.commerce) {
        return college.groups.commerce.gpa5 || 0;
      }
      if (grp === 'humanities' && college.groups && college.groups.humanities) {
        return college.groups.humanities.gpa5 || 0;
      }
      return college.gpa5_count || 0;
    }

    if (key === 'gpa5_rate') {
      if (grp === 'science' && college.groups && college.groups.science && college.groups.science.total > 0) {
        return Number(((college.groups.science.gpa5 / college.groups.science.total) * 100).toFixed(2));
      }
      if (grp === 'commerce' && college.groups && college.groups.commerce && college.groups.commerce.total > 0) {
        return Number(((college.groups.commerce.gpa5 / college.groups.commerce.total) * 100).toFixed(2));
      }
      if (grp === 'humanities' && college.groups && college.groups.humanities && college.groups.humanities.total > 0) {
        return Number(((college.groups.humanities.gpa5 / college.groups.humanities.total) * 100).toFixed(2));
      }
      return college.avg_gpa5_rate || college.gpa5_rate || 0;
    }

    if (key === 'science_gpa5') return college.groups && college.groups.science ? (college.groups.science.gpa5 || 0) : 0;
    if (key === 'commerce_gpa5') return college.groups && college.groups.commerce ? (college.groups.commerce.gpa5 || 0) : 0;
    if (key === 'arts_gpa5') return college.groups && college.groups.humanities ? (college.groups.humanities.gpa5 || 0) : 0;

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
      const rankLabel = `#${rank}`;
      
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

      document.querySelectorAll('#collegesGrid .btn-details[data-eiin]').forEach(btn => {
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
          <span class="banner-val highlight-name">${escapeHTML(college.name)} (EIIN: ${college.eiin})</span>
        </div>
        <div class="banner-row">
          <span class="banner-label">CENTRE:</span>
          <span class="banner-val">${escapeHTML(centreText)}, THANA: ${escapeHTML(college.thana)}, ZILLA: ${escapeHTML(college.district)}</span>
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

  function showLoadingState(boardKey) {
    const label = boardKey === 'ALL' ? 'full national catalog (7,473 institutions &bull; ~5.3 MB)...' : `${boardKey || 'Board'} chunk...`;
    collegesGrid.innerHTML = `
      <div class="no-results">
        <p>⚡ Fetching lightweight ${label}</p>
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


  // =========================================================================
  // MODULE 2: DHAKA BOARD PREVIOUS YEAR (2025) BENCHMARK ARCHIVE
  // =========================================================================
  let dhakaCollegesData = [];
  let dhakaFilteredData = [];
  let isDhakaInitialized = false;

  let dhakaCurrentPage = 1;
  let dhakaEntriesPerPage = 20;
  const dhakaState = {
    searchQuery: '',
    gpa: null,
    onlyEligible: false,
    district: 'ALL',
    thana: 'ALL',
    gender: 'ALL',
    group: 'ALL',
    shift: 'ALL',
    medium: 'ALL',
    sort: 'gpa_desc'
  };

  // DOM References (Dhaka Special)
  const dhakaSearchInput = document.getElementById('dhakaSearchInput');
  const dhakaGpaInput = document.getElementById('dhakaGpaInput');
  const dhakaGpaClearBtn = document.getElementById('dhakaGpaClearBtn');
  const dhakaGpaChips = document.querySelectorAll('.dhaka-gpa-chip');
  const gpaStatusFeedback = document.getElementById('gpaStatusFeedback');
  const dhakaOnlyEligibleToggle = document.getElementById('dhakaOnlyEligibleToggle');

  const dhakaDistrictFilter = document.getElementById('dhakaDistrictFilter');
  const dhakaThanaFilter = document.getElementById('dhakaThanaFilter');
  const dhakaGenderFilter = document.getElementById('dhakaGenderFilter');
  const dhakaGroupFilter = document.getElementById('dhakaGroupFilter');
  const dhakaShiftFilter = document.getElementById('dhakaShiftFilter');
  const dhakaMediumFilter = document.getElementById('dhakaMediumFilter');
  const dhakaSortFilter = document.getElementById('dhakaSortFilter');
  const dhakaEntriesPerPageSelect = document.getElementById('dhakaEntriesPerPage');
  const dhakaResetBtn = document.getElementById('dhakaResetBtn');
  const dhakaActiveFilterTags = document.getElementById('dhakaActiveFilterTags');

  const dhakaGroupTabs = document.querySelectorAll('#dhakaGroupTabs .tab-btn');
  const dhakaPrevPageBtn = document.getElementById('dhakaPrevPageBtn');
  const dhakaNextPageBtn = document.getElementById('dhakaNextPageBtn');
  const dhakaPageIndicator = document.getElementById('dhakaPageIndicator');
  const dhakaVisibleCount = document.getElementById('dhakaVisibleCount');
  const dhakaVisibleSeats = document.getElementById('dhakaVisibleSeats');
  const dhakaCollegesGrid = document.getElementById('dhakaCollegesGrid');

  const dhakaDetailModal = document.getElementById('dhakaDetailModal');
  const dhakaModalClose = document.getElementById('dhakaModalClose');
  const dhakaModalTitle = document.getElementById('dhakaModalTitle');
  const dhakaModalSubtitle = document.getElementById('dhakaModalSubtitle');
  const dhakaModalEiinTag = document.getElementById('dhakaModalEiinTag');
  const dhakaModalBody = document.getElementById('dhakaModalBody');

  async function initDhakaSection() {
    if (isDhakaInitialized) return;

    try {
      showDhakaLoadingState();

      const response = await fetch('./data/dhaka_colleges.json');
      if (!response.ok) {
        throw new Error(`Failed to load Dhaka Board dataset (${response.status} ${response.statusText})`);
      }
      const rawDhaka = await response.json();

      // Hardcoded Exclusion: Never display Hermann Gmeiner / SOS Hermann Gmeiner / EIIN 108215
      dhakaCollegesData = rawDhaka.filter(c => {
        if (!c) return false;
        const eiin = String(c.eiin || '').trim();
        const name = String(c.name || '').toUpperCase();
        if (eiin === '108215' || name.includes('HERMANN') || name.includes('GMEINER')) {
          return false;
        }
        return true;
      });

      isDhakaInitialized = true;

      populateDhakaDistricts();
      setupDhakaEventListeners();
      applyDhakaFiltersAndRender();
    } catch (err) {
      console.error('Dhaka Board initialization error:', err);
      showDhakaErrorState(err.message);
    }
  }

  function populateDhakaDistricts() {
    const districts = setSortedUnique(dhakaCollegesData.map(c => c.zilla));
    dhakaDistrictFilter.innerHTML = '<option value="ALL">All Dhaka Districts (15 Zillas)</option>';
    const fragment = document.createDocumentFragment();
    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      fragment.appendChild(opt);
    });
    dhakaDistrictFilter.appendChild(fragment);

    populateDhakaThanas();
  }

  function populateDhakaThanas() {
    const activeDistrict = dhakaState.district;
    let relevant = dhakaCollegesData;
    if (activeDistrict !== 'ALL') {
      relevant = relevant.filter(c => c.zilla.toUpperCase() === activeDistrict.toUpperCase());
    }

    const thanas = setSortedUnique(relevant.map(c => c.thana));
    dhakaThanaFilter.innerHTML = '<option value="ALL">All Thanas</option>';
    const fragment = document.createDocumentFragment();
    thanas.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      fragment.appendChild(opt);
    });
    dhakaThanaFilter.appendChild(fragment);
  }

  function setupDhakaEventListeners() {
    const debouncedDhakaSearch = debounce((val) => {
      dhakaState.searchQuery = val.trim().toLowerCase();
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    }, 150);

    dhakaSearchInput.addEventListener('input', (e) => {
      debouncedDhakaSearch(e.target.value);
    });

    dhakaGpaInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0.0 && val <= 5.0) {
        dhakaState.gpa = parseFloat(val.toFixed(2));
        dhakaState.sort = 'gpa_desc';
        dhakaSortFilter.value = 'gpa_desc';
      } else {
        dhakaState.gpa = null;
      }
      dhakaCurrentPage = 1;
      updateGpaStatusFeedback();
      updateActiveGpaChips();
      applyDhakaFiltersAndRender();
    });

    dhakaGpaClearBtn.addEventListener('click', () => {
      dhakaGpaInput.value = '';
      dhakaState.gpa = null;
      dhakaCurrentPage = 1;
      updateGpaStatusFeedback();
      updateActiveGpaChips();
      applyDhakaFiltersAndRender();
    });

    dhakaGpaChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseFloat(chip.dataset.gpa);
        if (dhakaState.gpa === val) {
          dhakaState.gpa = null;
          dhakaGpaInput.value = '';
        } else {
          dhakaState.gpa = val;
          dhakaGpaInput.value = val.toFixed(2);
          dhakaState.sort = 'gpa_desc';
          dhakaSortFilter.value = 'gpa_desc';
        }
        dhakaCurrentPage = 1;
        updateGpaStatusFeedback();
        updateActiveGpaChips();
        applyDhakaFiltersAndRender();
      });
    });

    dhakaOnlyEligibleToggle.addEventListener('change', (e) => {
      dhakaState.onlyEligible = e.target.checked;
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    });

    dhakaDistrictFilter.addEventListener('change', (e) => {
      dhakaState.district = e.target.value;
      dhakaState.thana = 'ALL';
      dhakaCurrentPage = 1;
      populateDhakaThanas();
      applyDhakaFiltersAndRender();
    });

    dhakaThanaFilter.addEventListener('change', (e) => {
      dhakaState.thana = e.target.value;
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    });

    dhakaGenderFilter.addEventListener('change', (e) => {
      dhakaState.gender = e.target.value;
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    });

    dhakaGroupFilter.addEventListener('change', (e) => {
      dhakaState.group = e.target.value;
      dhakaCurrentPage = 1;
      syncDhakaGroupTabs(e.target.value);
      applyDhakaFiltersAndRender();
    });

    dhakaShiftFilter.addEventListener('change', (e) => {
      dhakaState.shift = e.target.value;
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    });

    dhakaMediumFilter.addEventListener('change', (e) => {
      dhakaState.medium = e.target.value;
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    });

    dhakaSortFilter.addEventListener('change', (e) => {
      dhakaState.sort = e.target.value;
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    });

    dhakaEntriesPerPageSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      dhakaEntriesPerPage = val === 'ALL' ? 'ALL' : parseInt(val, 10);
      dhakaCurrentPage = 1;
      applyDhakaFiltersAndRender();
    });

    dhakaGroupTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        dhakaGroupTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const grp = tab.dataset.dhakaGroup;
        dhakaState.group = grp;
        dhakaGroupFilter.value = grp;
        dhakaCurrentPage = 1;
        applyDhakaFiltersAndRender();
      });
    });

    dhakaPrevPageBtn.addEventListener('click', () => {
      if (dhakaCurrentPage > 1) {
        dhakaCurrentPage--;
        applyDhakaFiltersAndRender();
        scrollToTopDhaka();
      }
    });

    dhakaNextPageBtn.addEventListener('click', () => {
      const totalPages = getDhakaTotalPages();
      if (dhakaCurrentPage < totalPages) {
        dhakaCurrentPage++;
        applyDhakaFiltersAndRender();
        scrollToTopDhaka();
      }
    });

    dhakaResetBtn.addEventListener('click', resetDhakaFilters);

    dhakaModalClose.addEventListener('click', closeDhakaModal);
    dhakaDetailModal.addEventListener('click', (e) => {
      if (e.target === dhakaDetailModal) closeDhakaModal();
    });
  }

  function updateActiveGpaChips() {
    dhakaGpaChips.forEach(chip => {
      if (dhakaState.gpa !== null && parseFloat(chip.dataset.gpa) === dhakaState.gpa) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  function syncDhakaGroupTabs(selectedGroup) {
    dhakaGroupTabs.forEach(tab => {
      if (tab.dataset.dhakaGroup === selectedGroup) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  function resetDhakaFilters() {
    dhakaState.searchQuery = '';
    dhakaState.gpa = null;
    dhakaState.onlyEligible = false;
    dhakaState.district = 'ALL';
    dhakaState.thana = 'ALL';
    dhakaState.gender = 'ALL';
    dhakaState.group = 'ALL';
    dhakaState.shift = 'ALL';
    dhakaState.medium = 'ALL';
    dhakaState.sort = 'gpa_desc';

    dhakaSearchInput.value = '';
    dhakaGpaInput.value = '';
    dhakaOnlyEligibleToggle.checked = false;
    dhakaDistrictFilter.value = 'ALL';
    dhakaThanaFilter.value = 'ALL';
    dhakaGenderFilter.value = 'ALL';
    dhakaGroupFilter.value = 'ALL';
    dhakaShiftFilter.value = 'ALL';
    dhakaMediumFilter.value = 'ALL';
    dhakaSortFilter.value = 'gpa_desc';
    dhakaEntriesPerPageSelect.value = '20';
    dhakaEntriesPerPage = 20;
    dhakaCurrentPage = 1;

    populateDhakaThanas();
    updateGpaStatusFeedback();
    updateActiveGpaChips();
    syncDhakaGroupTabs('ALL');
    applyDhakaFiltersAndRender();
  }

  function updateGpaStatusFeedback() {
    if (dhakaState.gpa === null) {
      gpaStatusFeedback.textContent = 'No GPA Entered';
      gpaStatusFeedback.className = 'gpa-status-badge';
      if (dhakaGpaClearBtn) dhakaGpaClearBtn.style.display = 'none';
    } else {
      gpaStatusFeedback.textContent = `Candidate GPA: ${dhakaState.gpa.toFixed(2)} (Active)`;
      gpaStatusFeedback.className = 'gpa-status-badge active-gpa';
      if (dhakaGpaClearBtn) dhakaGpaClearBtn.style.display = 'block';
    }
  }

  function scrollToTopDhaka() {
    dhakaSection.scrollIntoView({ behavior: 'smooth' });
  }

  function applyDhakaFiltersAndRender() {
    if (!dhakaCollegesData || dhakaCollegesData.length === 0) return;

    let result = [...dhakaCollegesData];

    // District Filter
    if (dhakaState.district !== 'ALL') {
      result = result.filter(c => c.zilla.toUpperCase() === dhakaState.district.toUpperCase());
    }

    // Thana Filter
    if (dhakaState.thana !== 'ALL') {
      result = result.filter(c => c.thana.toUpperCase() === dhakaState.thana.toUpperCase());
    }

    // Search query
    if (dhakaState.searchQuery) {
      const q = dhakaState.searchQuery;
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) ||
        String(c.eiin).includes(q) ||
        c.thana.toLowerCase().includes(q) ||
        c.zilla.toLowerCase().includes(q)
      );
    }

    // Filter by offers matching criteria
    result = result.filter(c => {
      const matchingOffers = c.offers.filter(offer => {
        // Group filter
        if (dhakaState.group !== 'ALL' && offer.group.toUpperCase() !== dhakaState.group.toUpperCase()) {
          return false;
        }

        // Shift filter
        if (dhakaState.shift !== 'ALL' && offer.shift.toUpperCase() !== dhakaState.shift.toUpperCase()) {
          return false;
        }

        // Medium filter
        if (dhakaState.medium !== 'ALL' && offer.medium.toUpperCase() !== dhakaState.medium.toUpperCase()) {
          return false;
        }

        // Gender filter logic
        if (dhakaState.gender === 'Male') {
          if (offer.gender !== 'Male' && offer.gender !== 'Combined') return false;
        } else if (dhakaState.gender === 'Female') {
          if (offer.gender !== 'Female' && offer.gender !== 'Combined') return false;
        } else if (dhakaState.gender === 'Combined') {
          if (offer.gender !== 'Combined') return false;
        } else if (dhakaState.gender === 'MaleOnly') {
          if (offer.gender !== 'Male') return false;
        } else if (dhakaState.gender === 'FemaleOnly') {
          if (offer.gender !== 'Female') return false;
        }

        // GPA eligibility filter (if user checked 'Only show colleges where I meet min GPA')
        if (dhakaState.onlyEligible && dhakaState.gpa !== null) {
          if (offer.min_gpa > dhakaState.gpa) return false;
        }

        return true;
      });

      return matchingOffers.length > 0;
    });

    // Sorting
    result.sort((a, b) => {
      switch (dhakaState.sort) {
        case 'gpa_desc':
          // Top to Low GPA: Colleges with highest minimum GPA requirements first
          return (b.min_gpa_highest - a.min_gpa_highest) || (b.min_gpa_lowest - a.min_gpa_lowest) || (b.total_seat - a.total_seat) || a.name.localeCompare(b.name);
        case 'gpa_asc':
          // Low to Top GPA: Colleges with lowest minimum GPA requirements first
          return (a.min_gpa_lowest - b.min_gpa_lowest) || (a.min_gpa_highest - b.min_gpa_highest) || (b.total_seat - a.total_seat) || a.name.localeCompare(b.name);
        case 'seat_desc':
          return (b.total_seat - a.total_seat) || a.name.localeCompare(b.name);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return (b.min_gpa_highest - a.min_gpa_highest) || (b.total_seat - a.total_seat);
      }
    });

    dhakaFilteredData = result;

    // Update stats counters
    const totalApprovedSeats = dhakaFilteredData.reduce((sum, c) => sum + c.total_seat, 0);
    dhakaVisibleCount.textContent = dhakaFilteredData.length.toLocaleString();
    dhakaVisibleSeats.textContent = totalApprovedSeats.toLocaleString();

    renderDhakaFilterTags();
    updateDhakaPaginationUI();
    renderDhakaCards(getDhakaCurrentPageBatch());
  }

  function renderDhakaFilterTags() {
    const tags = [];
    if (dhakaState.gpa !== null) {
      tags.push(`Candidate GPA: ${dhakaState.gpa.toFixed(2)}`);
    }
    if (dhakaState.onlyEligible) {
      tags.push(`Filter: Only Eligible (2025 Cutoffs)`);
    }
    if (dhakaState.district !== 'ALL') {
      tags.push(`Zilla: ${dhakaState.district}`);
    }
    if (dhakaState.thana !== 'ALL') {
      tags.push(`Thana: ${dhakaState.thana}`);
    }
    if (dhakaState.gender !== 'ALL') {
      tags.push(`Gender: ${dhakaState.gender}`);
    }
    if (dhakaState.group !== 'ALL') {
      tags.push(`Group: ${dhakaState.group}`);
    }
    if (dhakaState.shift !== 'ALL') {
      tags.push(`Shift: ${dhakaState.shift}`);
    }
    if (dhakaState.medium !== 'ALL') {
      tags.push(`Version: ${dhakaState.medium}`);
    }

    if (tags.length === 0) {
      dhakaActiveFilterTags.innerHTML = '<span class="preset-label">No custom filters applied</span>';
    } else {
      dhakaActiveFilterTags.innerHTML = tags.map(t => `<span class="dhaka-tag-pill">${escapeHTML(t)}</span>`).join('');
    }
  }

  function getDhakaTotalPages() {
    if (dhakaEntriesPerPage === 'ALL' || dhakaFilteredData.length === 0) return 1;
    return Math.ceil(dhakaFilteredData.length / dhakaEntriesPerPage);
  }

  function getDhakaCurrentPageBatch() {
    if (dhakaEntriesPerPage === 'ALL') return dhakaFilteredData;
    const start = (dhakaCurrentPage - 1) * dhakaEntriesPerPage;
    return dhakaFilteredData.slice(start, start + dhakaEntriesPerPage);
  }

  function updateDhakaPaginationUI() {
    const totalPages = getDhakaTotalPages();
    dhakaPageIndicator.textContent = `Page ${dhakaCurrentPage} of ${totalPages}`;

    dhakaPrevPageBtn.disabled = (dhakaCurrentPage <= 1);
    dhakaNextPageBtn.disabled = (dhakaCurrentPage >= totalPages);
  }

  function renderDhakaCards(batch) {
    if (batch.length === 0) {
      dhakaCollegesGrid.innerHTML = `
        <div class="no-results">
          <h3>No Dhaka Colleges Found</h3>
          <p>Try lowering the GPA benchmark, clearing gender/shift filters, or selecting All Districts.</p>
        </div>
      `;
      return;
    }

    const candidateGpa = dhakaState.gpa;

    const html = batch.map(college => {
      // Min GPA display range
      const gpaDisplay = college.min_gpa_lowest === college.min_gpa_highest 
        ? `GPA ${college.min_gpa_lowest.toFixed(2)}` 
        : `GPA ${college.min_gpa_lowest.toFixed(2)} &ndash; ${college.min_gpa_highest.toFixed(2)}`;

      // Calculate candidate eligibility if GPA is provided
      let eligibilityAlertHtml = '';
      if (candidateGpa !== null) {
        const eligibleOffers = college.offers.filter(o => candidateGpa >= o.min_gpa);
        const totalOffers = college.offers.length;

        if (eligibleOffers.length === totalOffers) {
          eligibilityAlertHtml = `
            <div class="eligibility-alert-box eligible-all">
              <span>✓ Your GPA meets 2025 requirement for ALL ${totalOffers} streams</span>
              <span>Min GPA Met</span>
            </div>
          `;
        } else if (eligibleOffers.length > 0) {
          eligibilityAlertHtml = `
            <div class="eligibility-alert-box eligible-partial">
              <span>✓ Meets 2025 requirement for ${eligibleOffers.length} of ${totalOffers} streams</span>
              <span>Partial Cutoff Met</span>
            </div>
          `;
        } else {
          eligibilityAlertHtml = `
            <div class="eligibility-alert-box eligible-none">
              <span>⚠️ Below 2025 Cutoff (Requires GPA &ge; ${college.min_gpa_lowest.toFixed(2)})</span>
              <span>Below Cutoff</span>
            </div>
          `;
        }
      }

      // Render top 4 offerings in the card
      const displayedOffers = college.offers.slice(0, 4);
      const remainingOffersCount = college.offers.length - displayedOffers.length;

      const offersHtml = displayedOffers.map(offer => {
        let groupClass = 'group-other';
        if (offer.group === 'Science') groupClass = 'group-sc';
        else if (offer.group === 'Business Studies') groupClass = 'group-cm';
        else if (offer.group === 'Humanities') groupClass = 'group-hu';

        let isEligible = true;
        if (candidateGpa !== null) {
          isEligible = (candidateGpa >= offer.min_gpa);
        }

        const matchClass = isEligible ? 'offer-match' : 'offer-mismatch';

        return `
          <div class="dhaka-offer-item ${matchClass}">
            <div class="dhaka-offer-left">
              <span class="dhaka-group-badge ${groupClass}">${escapeHTML(offer.group)}</span>
              <span class="dhaka-spec-chip">${escapeHTML(offer.medium)}</span>
              <span class="dhaka-spec-chip">${escapeHTML(offer.shift)}</span>
              <span class="dhaka-spec-chip">${escapeHTML(offer.gender)}</span>
            </div>
            <div class="dhaka-offer-right">
              <span class="dhaka-gpa-req ${offer.min_gpa >= 4.0 ? 'gpa-strict' : ''}">Min GPA: ${offer.min_gpa.toFixed(2)}</span>
              <span class="dhaka-seat-stat">Seats: <strong>${offer.total_seat}</strong></span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <article class="dhaka-card" data-eiin="${college.eiin}">
          <div>
            <div class="dhaka-card-header">
              <div>
                <h3 class="dhaka-card-title">${escapeHTML(college.name)}</h3>
                <div class="dhaka-card-location">
                  ${escapeHTML(college.thana)}, ${escapeHTML(college.zilla)} (Dhaka Board)
                </div>
                <div class="dhaka-card-tags">
                  <span class="dhaka-eiin-badge">EIIN: ${college.eiin}</span>
                  <span class="dhaka-eiin-badge">${college.offers.length} Stream Offerings</span>
                </div>
              </div>
              <span class="dhaka-seat-pill pill-available">Capacity: ${college.total_seat.toLocaleString()} Seats</span>
            </div>

            <!-- KEY METRICS ROW (BENCHMARK) -->
            <div class="dhaka-card-metrics">
              <div class="dhaka-metric-block">
                <span class="dhaka-metric-val">${college.total_seat.toLocaleString()}</span>
                <span class="dhaka-metric-lbl">Approved Seats</span>
              </div>
              <div class="dhaka-metric-block">
                <span class="dhaka-metric-val green-val">${gpaDisplay}</span>
                <span class="dhaka-metric-lbl">2025 Min GPA Cutoff</span>
              </div>
              <div class="dhaka-metric-block">
                <span class="dhaka-metric-val cyan-val">${college.offers.length}</span>
                <span class="dhaka-metric-lbl">Course Streams</span>
              </div>
            </div>

            <!-- CANDIDATE ELIGIBILITY ALERT -->
            ${eligibilityAlertHtml}

            <!-- STREAM OFFERINGS MINI LIST -->
            <div class="dhaka-offers-list">
              ${offersHtml}
              ${remainingOffersCount > 0 ? `
                <div style="text-align: center; font-size: 0.76rem; color: var(--text-dim); padding-top: 2px;">
                  + ${remainingOffersCount} more 2025 stream offerings available
                </div>
              ` : ''}
            </div>
          </div>

          <button class="btn-dhaka-details" data-dhaka-eiin="${college.eiin}">
            <span>View Full 2025 Requirements Breakdown</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </article>
      `;
    }).join('');

    window.requestAnimationFrame(() => {
      dhakaCollegesGrid.innerHTML = html;

      document.querySelectorAll('#dhakaCollegesGrid .btn-dhaka-details[data-dhaka-eiin]').forEach(btn => {
        btn.addEventListener('click', () => {
          const eiin = btn.dataset.dhakaEiin;
          const college = dhakaCollegesData.find(c => c.eiin === eiin);
          if (college) openDhakaModal(college);
        });
      });
    });
  }

  function openDhakaModal(college) {
    dhakaModalTitle.textContent = college.name;
    dhakaModalSubtitle.textContent = `Thana: ${college.thana} • District: ${college.zilla} • Dhaka Board`;
    dhakaModalEiinTag.textContent = `EIIN: ${college.eiin}`;

    const candidateGpa = dhakaState.gpa;

    const tableRows = college.offers.map((o, idx) => {
      let isEligible = true;
      if (candidateGpa !== null) {
        isEligible = candidateGpa >= o.min_gpa;
      }
      const rowClass = candidateGpa !== null ? (isEligible ? 'row-eligible' : 'row-ineligible') : '';
      const statusBadge = candidateGpa !== null
        ? (isEligible ? '<span class="status-badge-eligible">✓ Meets Cutoff</span>' : '<span class="status-badge-ineligible">✗ Below Cutoff</span>')
        : '<span class="dhaka-spec-chip">2025 Archive</span>';

      return `
        <tr class="${rowClass}">
          <td><strong>${idx + 1}</strong></td>
          <td><strong>${escapeHTML(o.group)}</strong></td>
          <td>${escapeHTML(o.medium)}</td>
          <td>${escapeHTML(o.shift)}</td>
          <td>${escapeHTML(o.gender)}</td>
          <td><strong style="color: var(--accent-amber);">GPA ${o.min_gpa.toFixed(2)}</strong></td>
          <td><strong style="color: var(--accent-emerald);">${o.total_seat}</strong></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

    dhakaModalBody.innerHTML = `
      <div class="dhaka-modal-notice-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span><strong>Historical Reference (2025 Archive)</strong>: Statistics and cutoffs reflect the previous admission batch. Current criteria are determined by college authorities and Board circulars.</span>
      </div>

      <div class="modal-dashboard-grid" style="margin-bottom: 20px;">
        <div class="dash-card">
          <span class="dash-label">Total Approved Seats</span>
          <span class="dash-val">${college.total_seat.toLocaleString()}</span>
          <span class="dash-sub">Total Seat Capacity</span>
        </div>
        <div class="dash-card highlight-emerald">
          <span class="dash-label">Min GPA Range</span>
          <span class="dash-val emerald-txt">${college.min_gpa_lowest === college.min_gpa_highest ? `GPA ${college.min_gpa_lowest.toFixed(2)}` : `GPA ${college.min_gpa_lowest.toFixed(2)} – ${college.min_gpa_highest.toFixed(2)}`}</span>
          <span class="dash-sub">Across All Offered Streams</span>
        </div>
        <div class="dash-card highlight-cyan">
          <span class="dash-label">Total Course Offerings</span>
          <span class="dash-val cyan-txt">${college.offers.length}</span>
          <span class="dash-sub">Stream / Shift Combinations</span>
        </div>
      </div>

      <h4 class="modal-section-title">Official 2025 Seat Allocation & Minimum GPA Requirements Matrix</h4>
      <div class="dhaka-modal-table-wrap">
        <table class="dhaka-modal-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Group / Stream</th>
              <th>Version</th>
              <th>Shift</th>
              <th>Gender</th>
              <th>2025 Min GPA Cutoff</th>
              <th>Approved Seats</th>
              <th>Your Eligibility (2025 Benchmark)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    dhakaDetailModal.classList.add('active');
    dhakaDetailModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDhakaModal() {
    dhakaDetailModal.classList.remove('active');
    dhakaDetailModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showDhakaLoadingState() {
    dhakaCollegesGrid.innerHTML = `
      <div class="no-results">
        <p>Loading official Dhaka Board 2025 admission requirements matrix...</p>
      </div>
    `;
  }

  function showDhakaErrorState(msg) {
    dhakaCollegesGrid.innerHTML = `
      <div class="no-results" style="color: var(--accent-red);">
        <h3>Error Loading Dhaka Dataset</h3>
        <p>${escapeHTML(msg)}</p>
      </div>
    `;
  }

});
