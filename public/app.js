document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const searchInput = document.getElementById('search-input');
  const searchType = document.getElementById('search-type');
  const passwordsContainer = document.getElementById('passwords-container');
  const addForm = document.getElementById('add-form');
  const addOtherBtn = document.getElementById('add-other');
  const otherFields = document.getElementById('other-fields');
  const jsonPathInput = document.getElementById('json-path');
  const saveConfigBtn = document.getElementById('save-config');
  const browseBtn = document.getElementById('browse-btn');
  const fileBrowser = document.getElementById('file-browser');
  const currentDir = document.getElementById('current-dir');
  const fileList = document.getElementById('file-list');
  const closeBrowser = document.getElementById('close-browser');
  const openConfigBtn = document.getElementById('open-config');
  const cancelConfigBtn = document.getElementById('cancel-config');
  const configSection = document.getElementById('config-section');
  const toggleAddBtn = document.getElementById('toggle-add');
  const addSection = document.getElementById('add-section');
  const loginSection = document.getElementById('login-section');
  const loginForm = document.getElementById('login-form');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const changePasswordSection = document.getElementById('change-password-section');
  const changePasswordForm = document.getElementById('change-password-form');
  const oldPassword = document.getElementById('old-password');
  const newPassword = document.getElementById('new-password');
  const confirmPassword = document.getElementById('confirm-password');
  const changeError = document.getElementById('change-error');
  const cancelChangePassword = document.getElementById('cancel-change-password');
  const logoutBtn = document.getElementById('logout-btn');
  const main = document.querySelector('main');

  let passwords = [];
  let otherCount = 0;

  // Check authentication
  // if (localStorage.getItem('authenticated') !== 'true') {
    loginSection.style.display = 'block';
    main.style.display = 'none';
  // } else {
  //   loginSection.style.display = 'none';
  //   main.style.display = 'block';
  //   loadConfig();
  //   loadPasswords();
  // }

  const getDirectory = (filePath) => {
    if (!filePath) return '/';
    const normalized = filePath.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    if (idx < 0) return '/';
    return normalized.substring(0, idx) || '/';
  };

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.add(savedTheme);

  // Login form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = loginPassword.value;
    try {
      const response = await fetch('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('authenticated', 'true');
        loginSection.style.display = 'none';
        main.style.display = 'block';
        loadConfig();
        loadPasswords();
        loginError.style.display = 'none';
      } else {
        loginError.style.display = 'block';
      }
    } catch (error) {
      console.error('Login error:', error);
      loginError.style.display = 'block';
    }
  });

  // Change password button
  changePasswordBtn.addEventListener('click', () => {
    changePasswordSection.style.display = 'block';
  });

  // Logout button
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authenticated');
    location.reload();
  });

  // Change password form
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPass = oldPassword.value;
    const newPass = newPassword.value;
    const confirmPass = confirmPassword.value;
    if (newPass !== confirmPass) {
      changeError.textContent = 'New passwords do not match';
      changeError.style.display = 'block';
      return;
    }
    try {
      const response = await fetch('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
      });
      const result = await response.json();
      if (result.success) {
        changePasswordSection.style.display = 'none';
        changeError.style.display = 'none';
        alert('Password changed successfully');
      } else {
        changeError.textContent = result.error || 'Failed to change password';
        changeError.style.display = 'block';
      }
    } catch (error) {
      console.error('Change password error:', error);
      changeError.textContent = 'Error changing password';
      changeError.style.display = 'block';
    }
  });

  // Cancel change password
  cancelChangePassword.addEventListener('click', () => {
    changePasswordSection.style.display = 'none';
    changeError.style.display = 'none';
  });

  async function loadConfig() {
    try {
      const response = await fetch('/config');
      const config = await response.json();
      jsonPathInput.value = config.jsonPath || '';
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  async function loadPasswords() {
    try {
      const response = await fetch('/passwords');
      passwords = await response.json();
      renderPasswords();
    } catch (error) {
      console.error('Error loading passwords:', error);
    }
  }

  function renderPasswords(filtered = passwords) {
    passwordsContainer.innerHTML = '';
    filtered.forEach((pwd, index) => {
      const originalIndex = passwords.indexOf(pwd);
      const block = document.createElement('div');
      block.className = 'password-block';

      let html = `
        <div class="password-block-top">
          <div class="top-content">
            <p class="target-name">${pwd.targetName}</p>
            <button class="edit-btn" data-index="${originalIndex}">Edit</button>
          </div>
        </div>
        <div class="password-block-bottom">
          <p><strong>Username:</strong> ${pwd.keyName}</p>
          <p><strong>Password:</strong> <span class="password-value" data-index="${originalIndex}">********</span></p>
          ${pwd.targetUrl ? `<p><strong>Address:</strong> ${pwd.targetUrl}</p>` : ''}
          ${Object.keys(pwd).filter(key => key.startsWith('Other_')).map(key => `<p><strong>${key}:</strong> ${pwd[key]}</p>`).join('')}
        </div>
      `;

      block.innerHTML = html;
      passwordsContainer.appendChild(block);
    });

    document.querySelectorAll('.password-value').forEach(span => {
      span.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        const pwd = passwords[index];
        if (e.target.textContent === '********') {
          e.target.textContent = pwd.keyValue;
        } else {
          e.target.textContent = '********';
        }
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const pwd = passwords[index];
        const block = e.target.closest('.password-block');
        const bottom = block.querySelector('.password-block-bottom');
        bottom.dataset.originalHtml = bottom.innerHTML;

        let otherCount = 0;
        let otherHtml = '';
        Object.keys(pwd).forEach(key => {
          if (key.startsWith('Other_')) {
            otherCount++;
            otherHtml += `<div><input type="text" placeholder="Field name" value="${key}" id="edit-other-key-${index}-${otherCount}"> <input type="text" placeholder="Value" value="${pwd[key]}" id="edit-other-value-${index}-${otherCount}"></div>`;
          }
        });

        bottom.innerHTML = `
          <form class="edit-form">
            <input type="text" id="edit-keyName-${index}" value="${pwd.keyName}" required>
            <input type="text" id="edit-keyValue-${index}" value="${pwd.keyValue}" required>
            <input type="text" id="edit-targetName-${index}" value="${pwd.targetName}" required>
            <input type="text" id="edit-targetUrl-${index}" value="${pwd.targetUrl || ''}">
            <div id="edit-other-fields-${index}">${otherHtml}</div>
            <button type="button" id="edit-add-other-${index}">Add Extra Field</button>
            <button type="button" id="edit-save-${index}" data-index="${index}">Save</button>
            <button type="button" id="edit-cancel-${index}">Cancel</button>
          </form>
        `;

        bottom.querySelector(`#edit-add-other-${index}`).addEventListener('click', () => {
          otherCount++;
          const div = document.createElement('div');
          div.innerHTML = `<input type="text" placeholder="Field name" id="edit-other-key-${index}-${otherCount}"> <input type="text" placeholder="Value" id="edit-other-value-${index}-${otherCount}">`;
          bottom.querySelector(`#edit-other-fields-${index}`).appendChild(div);
        });

        bottom.querySelector(`#edit-save-${index}`).addEventListener('click', async () => {
          const newPwd = {
            keyName: bottom.querySelector(`#edit-keyName-${index}`).value,
            keyValue: bottom.querySelector(`#edit-keyValue-${index}`).value,
            targetName: bottom.querySelector(`#edit-targetName-${index}`).value,
            targetUrl: bottom.querySelector(`#edit-targetUrl-${index}`).value
          };

          for (let i = 1; i <= otherCount; i++) {
            const key = bottom.querySelector(`#edit-other-key-${index}-${i}`)?.value;
            const value = bottom.querySelector(`#edit-other-value-${index}-${i}`)?.value;
            if (key && value) {
              newPwd[key] = value;
            }
          }

          try {
            const response = await fetch(`/passwords/${index}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newPwd)
            });
            if (response.ok) {
              loadPasswords();
            } else {
              alert('Error updating password');
            }
          } catch (error) {
            console.error('Error:', error);
          }
        });

        bottom.querySelector(`#edit-cancel-${index}`).addEventListener('click', () => {
          bottom.innerHTML = bottom.dataset.originalHtml;
          // Reattach listeners
          attachListeners();
        });
      });
    });
  }

  function attachListeners() {
    document.querySelectorAll('.password-value').forEach(span => {
      span.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        const pwd = passwords[index];
        if (e.target.textContent === '********') {
          e.target.textContent = pwd.keyValue;
        } else {
          e.target.textContent = '********';
        }
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // ... same as above
      });
    });
  }

  function filterPasswords() {
    const query = searchInput.value.toLowerCase();
    const type = searchType.value;
    const filtered = passwords.filter(pwd => pwd[type].toLowerCase().includes(query));
    renderPasswords(filtered);
  }

  searchInput.addEventListener('input', filterPasswords);
  searchType.addEventListener('change', filterPasswords);

  function scrollToElement(element) {
    const start = window.pageYOffset;
    const rect = element.getBoundingClientRect();
    const end = start + rect.top;
    const duration = 1000; // 1 second
    let startTime = null;

    function animate(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easeInOut = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      window.scrollTo(0, start + (end - start) * easeInOut);
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  toggleAddBtn.addEventListener('click', () => {
    addSection.style.display = addSection.style.display === 'none' ? 'block' : 'none';
    if (addSection.style.display === 'block') {
      scrollToElement(addSection);
    }
  });

  addOtherBtn.addEventListener('click', () => {
    otherCount++;
    const div = document.createElement('div');
    div.innerHTML = `<input type="text" placeholder="Field name" id="other-key-${otherCount}"> <input type="text" placeholder="Value" id="other-value-${otherCount}">`;
    otherFields.appendChild(div);
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPwd = {
      keyName: document.getElementById('keyName').value,
      keyValue: document.getElementById('keyValue').value,
      targetName: document.getElementById('targetName').value,
      targetUrl: document.getElementById('targetUrl').value
    };

    for (let i = 1; i <= otherCount; i++) {
      const key = document.getElementById(`other-key-${i}`)?.value;
      const value = document.getElementById(`other-value-${i}`)?.value;
      if (key && value) {
        newPwd[`Other_${key}`] = value;
      }
    }

    try {
      const response = await fetch('/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPwd)
      });
      if (response.ok) {
        addForm.reset();
        otherFields.innerHTML = '';
        otherCount = 0;
        addSection.style.display = 'none';
        loadPasswords();
      } else {
        alert('Error adding password');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  browseBtn.addEventListener('click', () => {
    const currentPath = jsonPathInput.value || '';
    const dir = getDirectory(currentPath);
    loadFiles(dir);
    fileBrowser.style.display = 'block';
  });

  closeBrowser.addEventListener('click', () => {
    fileBrowser.style.display = 'none';
  });

  openConfigBtn.addEventListener('click', () => {
    configSection.style.display = 'block';
    loadConfig();
  });

  cancelConfigBtn.addEventListener('click', () => {
    configSection.style.display = 'none';
    fileBrowser.style.display = 'none';
  });

  async function loadFiles(dir) {
    try {
      const response = await fetch(`/files?dir=${encodeURIComponent(dir)}`);
      const data = await response.json();
      currentDir.textContent = `Current: ${data.currentDir}`;
      fileList.innerHTML = '';
      if (!data.items.length) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No files in this directory.';
        emptyLi.style.fontStyle = 'italic';
        fileList.appendChild(emptyLi);
        return;
      }
      if (data.currentDir) {
        const parentDir = data.currentDir === '/' ? null : getDirectory(data.currentDir);
        if (parentDir && parentDir !== data.currentDir) {
          const parentLi = document.createElement('li');
          parentLi.textContent = '.. (Parent Directory)';
          parentLi.className = 'directory';
          parentLi.addEventListener('click', () => loadFiles(parentDir));
          fileList.appendChild(parentLi);
        }
      }
      data.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.name;
        li.className = item.isDirectory ? 'directory' : '';
        li.addEventListener('click', () => {
          if (item.isDirectory) {
            loadFiles(item.path);
          } else if (item.name.toLowerCase().endsWith('.json') || item.name.toLowerCase().endsWith('.jason')) {
            jsonPathInput.value = item.path;
            fileBrowser.style.display = 'none';
          }
        });
        fileList.appendChild(li);
      });
    } catch (error) {
      console.error('Error loading files:', error);
      currentDir.textContent = 'Current: (error loading directory)';
      fileList.innerHTML = '';
      const errorLi = document.createElement('li');
      errorLi.textContent = 'Unable to read this directory.';
      errorLi.style.color = 'red';
      fileList.appendChild(errorLi);
    }
  }

  saveConfigBtn.addEventListener('click', async () => {
    const jsonPath = jsonPathInput.value;
    try {
      const response = await fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonPath })
      });
      if (response.ok) {
        alert('Config saved');
        configSection.style.display = 'none';
        fileBrowser.style.display = 'none';
        loadPasswords();
      } else {
        alert('Error saving config');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  loadConfig();
  loadPasswords();
});