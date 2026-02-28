// === Atlas Frontend ===

document.addEventListener('DOMContentLoaded', () => {
  initHomeTabs();
  initCreateWorkspace();
  initAccessForm();
  initUpload();
  initDownloadButtons();
  initDeleteButtons();
  initShareButtons();
  initSharesPage();
  initSecretToggle();
  initPasteButton();
});

function initHomeTabs() {
  const tabsRoot = document.querySelector('[data-home-tabs]');
  if (!tabsRoot) return;

  const tabs = Array.from(tabsRoot.querySelectorAll('.home-tab'));
  const panels = Array.from(tabsRoot.querySelectorAll('.home-panel'));
  if (!tabs.length || !panels.length) return;

  function activateTab(nextTab) {
    const targetId = nextTab.dataset.tabTarget;
    if (!targetId) return;

    tabs.forEach((tab) => {
      const isActive = tab === nextTab;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const direction = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      activateTab(tabs[nextIndex]);
    });
  });
}

// === Create Workspace ===
function initCreateWorkspace() {
  const form = document.getElementById('create-workspace-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('workspace-name');
    const name = nameInput.value.trim();
    if (!name) return;

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur lors de la création.');
        return;
      }

      // Show secret modal
      const modal = document.getElementById('secret-modal');
      const secretDisplay = document.getElementById('owner-secret-display');
      secretDisplay.textContent = data.ownerSecret;
      modal.classList.remove('hidden');

      // Copy button
      document.getElementById('copy-secret').onclick = () => {
        copyToClipboard(data.ownerSecret, 'copy-feedback');
      };

      // Close modal -> go to workspace
      document.getElementById('close-modal').onclick = () => {
        window.location.href = `/workspace/${data.workspaceId}?secret=${encodeURIComponent(data.ownerSecret)}`;
      };
    } catch (err) {
      alert('Erreur réseau. Veuillez réessayer.');
    }
  });
}

// === Access Form ===
function initAccessForm() {
  const form = document.getElementById('access-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const secretInput = document.getElementById('access-secret');
    const secret = secretInput.value.trim();
    if (!secret) return;

    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Accès refusé.');
        return;
      }

      if (data.type === 'owner') {
        window.location.href = `/workspace/${data.workspaceId}?secret=${encodeURIComponent(secret)}`;
      } else if (data.scopeType === 'WORKSPACE') {
        window.location.href = `/workspace/${data.scopeId}?secret=${encodeURIComponent(secret)}`;
      } else if (data.scopeType === 'DOCUMENT') {
        window.location.href = `/doc/${data.scopeId}?secret=${encodeURIComponent(secret)}`;
      }
    } catch (err) {
      alert('Erreur réseau. Veuillez réessayer.');
    }
  });
}

// === Upload ===
function initUpload() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const folderInput = document.getElementById('folder-input');

  // Drag & drop
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFiles(Array.from(files), form);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        uploadFiles(Array.from(fileInput.files), form);
      }
    });
  }

  if (folderInput) {
    folderInput.addEventListener('change', () => {
      if (folderInput.files.length > 0) {
        uploadFiles(Array.from(folderInput.files), form);
      }
    });
  }
}

function uploadFiles(files, form) {
  const formData = new FormData();
  const workspaceId = form.querySelector('[name="workspaceId"]').value;
  const secret = form.querySelector('[name="secret"]').value;

  files.forEach((file) => {
    const relativePath = file.webkitRelativePath || file.name;
    formData.append('files', file);
    formData.append('relativePaths', relativePath);
  });
  formData.append('workspaceId', workspaceId);
  formData.append('secret', secret);

  const progressSection = document.getElementById('upload-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  progressSection.classList.remove('hidden');
  progressText.textContent = `0% (${files.length} fichier${files.length > 1 ? 's' : ''})`;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = `${pct}% (${files.length} fichier${files.length > 1 ? 's' : ''})`;
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status === 201) {
      window.location.reload();
    } else {
      try {
        const data = JSON.parse(xhr.responseText);
        alert(data.error || 'Erreur lors de l\'upload.');
      } catch {
        alert('Erreur lors de l\'upload.');
      }
      progressSection.classList.add('hidden');
    }
  });

  xhr.addEventListener('error', () => {
    alert('Erreur réseau lors de l\'upload.');
    progressSection.classList.add('hidden');
  });

  xhr.send(formData);
}

// === Download ===
function initDownloadButtons() {
  document.querySelectorAll('.download-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const documentId = btn.dataset.documentId;
      const secret = btn.dataset.secret;

      try {
        const res = await fetch('/api/download/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId, secret }),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Accès refusé.');
          return;
        }

        // Trigger download
        const a = document.createElement('a');
        a.href = `/api/download/${documentId}?secret=${encodeURIComponent(secret)}`;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        alert('Erreur réseau.');
      }
    });
  });
}

// === Delete ===
function initDeleteButtons() {
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce document ?')) return;

      const documentId = btn.dataset.documentId;
      const secret = btn.dataset.secret;

      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret }),
        });

        if (res.ok) {
          const card = btn.closest('.document-card');
          if (card) card.remove();
        } else {
          const data = await res.json();
          alert(data.error || 'Erreur lors de la suppression.');
        }
      } catch (err) {
        alert('Erreur réseau.');
      }
    });
  });
}

// === Share ===
function initShareButtons() {
  // Share individual document
  document.querySelectorAll('.share-doc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      createShare(btn.dataset.workspaceId, 'DOCUMENT', btn.dataset.documentId, btn.dataset.secret);
    });
  });

  // Share entire workspace
  const shareWorkspaceBtn = document.getElementById('share-workspace-btn');
  if (shareWorkspaceBtn) {
    shareWorkspaceBtn.addEventListener('click', () => {
      createShare(
        shareWorkspaceBtn.dataset.workspaceId,
        'WORKSPACE',
        shareWorkspaceBtn.dataset.workspaceId,
        shareWorkspaceBtn.dataset.secret,
      );
    });
  }
}

async function createShare(workspaceId, scopeType, scopeId, secret) {
  try {
    const res = await fetch('/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, scopeType, scopeId, secret }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Erreur.');
      return;
    }

    // Show share modal
    const modal = document.getElementById('share-modal');
    const secretDisplay = document.getElementById('share-secret-display');
    const valueToShare = getShareValueToDisplay(scopeType, scopeId, data.secret);
    updateShareModalContent(scopeType);
    secretDisplay.textContent = valueToShare;
    modal.classList.remove('hidden');

    document.getElementById('copy-share-secret').onclick = () => {
      copyToClipboard(valueToShare, 'share-copy-feedback');
    };

    document.getElementById('close-share-modal').onclick = () => {
      modal.classList.add('hidden');
    };
  } catch (err) {
    alert('Erreur réseau.');
  }
}

// === Shares Management Page ===
function initSharesPage() {
  const sharesList = document.getElementById('shares-list');
  if (!sharesList) return;

  const workspaceId = sharesList.dataset.workspaceId;
  const secret = sharesList.dataset.secret;

  loadShares(workspaceId, secret);
}

async function loadShares(workspaceId, secret) {
  const sharesList = document.getElementById('shares-list');

  try {
    const res = await fetch(`/api/shares?workspaceId=${workspaceId}&secret=${encodeURIComponent(secret)}`);
    const shares = await res.json();

    if (!res.ok) {
      sharesList.innerHTML = '<p class="alert alert-error">Erreur de chargement.</p>';
      return;
    }

    if (shares.length === 0) {
      sharesList.innerHTML = '<p class="text-muted">Aucun secret de partage créé.</p>';
      return;
    }

    sharesList.innerHTML = shares.map((share) => {
      const isRevoked = !!share.revokedAt;
      const date = new Date(share.createdAt).toLocaleDateString('fr-FR');
      const scopeLabel = share.scopeType === 'WORKSPACE' ? 'Espace entier' : 'Document';

      return `
        <div class="share-card ${isRevoked ? 'revoked' : ''}">
          <div class="share-info">
            <span class="share-scope">${scopeLabel}</span>
            <span class="share-meta">Créé le ${date} &mdash; ID: ${share.scopeId}</span>
            <span class="share-status ${isRevoked ? 'revoked' : 'active'}">
              ${isRevoked ? 'Révoqué' : 'Actif'}
            </span>
          </div>
          ${!isRevoked ? `
            <div class="share-actions">
              <button class="btn btn-sm btn-secondary regenerate-share-btn"
                data-share-id="${share._id}"
                data-workspace-id="${workspaceId}"
                data-secret="${secret}"
                data-scope-type="${share.scopeType}"
                data-scope-id="${share.scopeId}">
                Régénérer
              </button>
              <button class="btn btn-sm btn-danger revoke-share-btn"
                data-share-id="${share._id}"
                data-workspace-id="${workspaceId}"
                data-secret="${secret}">
                Révoquer
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach events
    sharesList.querySelectorAll('.regenerate-share-btn').forEach((btn) => {
      btn.addEventListener('click', () => regenerateShare(btn));
    });

    sharesList.querySelectorAll('.revoke-share-btn').forEach((btn) => {
      btn.addEventListener('click', () => revokeShare(btn));
    });
  } catch (err) {
    sharesList.innerHTML = '<p class="alert alert-error">Erreur réseau.</p>';
  }
}

async function regenerateShare(btn) {
  const shareId = btn.dataset.shareId;
  const workspaceId = btn.dataset.workspaceId;
  const secret = btn.dataset.secret;
  const scopeType = btn.dataset.scopeType;
  const scopeId = btn.dataset.scopeId;

  try {
    const res = await fetch(`/api/shares/${shareId}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, workspaceId }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Erreur.');
      return;
    }

    // Show regenerate modal
    const modal = document.getElementById('regenerate-modal');
    const valueToShare = getShareValueToDisplay(scopeType, scopeId, data.secret);
    updateRegenerateModalContent(scopeType);
    document.getElementById('regenerate-secret-display').textContent = valueToShare;
    modal.classList.remove('hidden');

    document.getElementById('copy-regenerate-secret').onclick = () => {
      copyToClipboard(valueToShare, 'regenerate-copy-feedback');
    };

    document.getElementById('close-regenerate-modal').onclick = () => {
      modal.classList.add('hidden');
      loadShares(workspaceId, secret);
    };
  } catch (err) {
    alert('Erreur réseau.');
  }
}

async function revokeShare(btn) {
  if (!confirm('Révoquer ce secret de partage ?')) return;

  const shareId = btn.dataset.shareId;
  const workspaceId = btn.dataset.workspaceId;
  const secret = btn.dataset.secret;

  try {
    const res = await fetch(`/api/shares/${shareId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, workspaceId }),
    });

    if (res.ok) {
      loadShares(workspaceId, secret);
    } else {
      const data = await res.json();
      alert(data.error || 'Erreur.');
    }
  } catch (err) {
    alert('Erreur réseau.');
  }
}

// === Secret toggle ===
function initSecretToggle() {
  const toggle = document.getElementById('toggle-secret');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const input = document.getElementById('access-secret');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
}

// === Paste button ===
function initPasteButton() {
  const pasteBtn = document.getElementById('paste-secret');
  if (!pasteBtn) return;

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('access-secret').value = text;
    } catch {
      // Clipboard API may not be available
    }
  });
}

// === Clipboard helper ===
function copyToClipboard(text, feedbackId) {
  navigator.clipboard.writeText(text).then(() => {
    const feedback = document.getElementById(feedbackId);
    if (feedback) {
      feedback.textContent = 'Copié !';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    }
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    const feedback = document.getElementById(feedbackId);
    if (feedback) {
      feedback.textContent = 'Copié !';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    }
  });
}

function getShareValueToDisplay(scopeType, scopeId, shareSecret) {
  if (scopeType === 'DOCUMENT') {
    return `${window.location.origin}/doc/${encodeURIComponent(scopeId)}?secret=${encodeURIComponent(shareSecret)}`;
  }

  return shareSecret;
}

function updateShareModalContent(scopeType) {
  const title = document.getElementById('share-modal-title');
  const description = document.getElementById('share-modal-description');
  if (!title || !description) return;

  if (scopeType === 'DOCUMENT') {
    title.textContent = 'Lien de partage';
    description.textContent = 'Copiez ce lien et transmettez-le pour voir ou télécharger le document.';
    return;
  }

  title.textContent = 'Secret de partage';
  description.textContent = 'Copiez ce secret et transmettez-le à la personne concernée.';
}

function updateRegenerateModalContent(scopeType) {
  const title = document.getElementById('regenerate-modal-title');
  const description = document.getElementById('regenerate-modal-description');
  if (!title || !description) return;

  if (scopeType === 'DOCUMENT') {
    title.textContent = 'Nouveau lien de partage';
    description.textContent = 'L’ancien accès a été invalidé. Copiez ce nouveau lien.';
    return;
  }

  title.textContent = 'Nouveau secret de partage';
  description.textContent = 'L\'ancien secret a été invalidé. Copiez le nouveau secret ci-dessous.';
}
