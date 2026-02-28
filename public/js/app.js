// === Atlas Frontend ===

document.addEventListener('DOMContentLoaded', () => {
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

// === Toast Notification System ===
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '\u2713',
    error: '\u2717',
    info: '\u2139',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
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

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Erreur lors de la creation.', 'error');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
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
      showToast('Erreur reseau. Veuillez reessayer.', 'error');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
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

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Acces refuse.', 'error');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
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
      showToast('Erreur reseau. Veuillez reessayer.', 'error');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  });
}

// === Upload ===
function initUpload() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

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
        uploadFile(files[0], form);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        uploadFile(fileInput.files[0], form);
      }
    });
  }
}

function uploadFile(file, form) {
  const formData = new FormData();
  const workspaceId = form.querySelector('[name="workspaceId"]').value;
  const secret = form.querySelector('[name="secret"]').value;

  formData.append('file', file);
  formData.append('workspaceId', workspaceId);
  formData.append('secret', secret);

  const progressSection = document.getElementById('upload-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  progressSection.classList.remove('hidden');

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');

  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = pct + '%';
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status === 201) {
      showToast('Document ajoute avec succes.', 'success');
      setTimeout(() => window.location.reload(), 800);
    } else {
      try {
        const data = JSON.parse(xhr.responseText);
        showToast(data.error || "Erreur lors de l'upload.", 'error');
      } catch {
        showToast("Erreur lors de l'upload.", 'error');
      }
      progressSection.classList.add('hidden');
    }
  });

  xhr.addEventListener('error', () => {
    showToast("Erreur reseau lors de l'upload.", 'error');
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
          showToast(data.error || 'Acces refuse.', 'error');
          return;
        }

        // Trigger download
        const a = document.createElement('a');
        a.href = `/api/download/${documentId}?secret=${encodeURIComponent(secret)}`;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast('Telechargement lance.', 'success', 2000);
      } catch (err) {
        showToast('Erreur reseau.', 'error');
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
          if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), 300);
          }
          showToast('Document supprime.', 'success');
        } else {
          const data = await res.json();
          showToast(data.error || 'Erreur lors de la suppression.', 'error');
        }
      } catch (err) {
        showToast('Erreur reseau.', 'error');
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
      showToast(data.error || 'Erreur.', 'error');
      return;
    }

    // Show share modal
    const modal = document.getElementById('share-modal');
    const secretDisplay = document.getElementById('share-secret-display');
    secretDisplay.textContent = data.secret;
    modal.classList.remove('hidden');

    document.getElementById('copy-share-secret').onclick = () => {
      copyToClipboard(data.secret, 'share-copy-feedback');
    };

    document.getElementById('close-share-modal').onclick = () => {
      modal.classList.add('hidden');
    };
  } catch (err) {
    showToast('Erreur reseau.', 'error');
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
      sharesList.innerHTML = '<div class="alert alert-error"><span class="alert-icon">\u2717</span><span>Erreur de chargement.</span></div>';
      return;
    }

    if (shares.length === 0) {
      sharesList.innerHTML = '<div class="empty-state"><span class="empty-state-icon">&#128279;</span><p>Aucun secret de partage cree.</p></div>';
      return;
    }

    sharesList.innerHTML = shares.map((share) => {
      const isRevoked = !!share.revokedAt;
      const date = new Date(share.createdAt).toLocaleDateString('fr-FR');
      const scopeLabel = share.scopeType === 'WORKSPACE' ? 'Espace entier' : 'Document';
      const scopeIcon = share.scopeType === 'WORKSPACE' ? '&#128194;' : '&#128196;';

      return `
        <div class="share-card ${isRevoked ? 'revoked' : ''}">
          <div class="share-info">
            <span class="share-scope">
              <span class="share-scope-badge">${scopeIcon} ${scopeLabel}</span>
            </span>
            <span class="share-meta">Cree le ${date} &mdash; ID: ${share.scopeId}</span>
            <span class="share-status ${isRevoked ? 'revoked' : 'active'}">
              <span class="share-status-dot"></span>
              ${isRevoked ? 'Revoque' : 'Actif'}
            </span>
          </div>
          ${!isRevoked ? `
            <div class="share-actions">
              <button class="btn btn-sm btn-outline regenerate-share-btn"
                data-share-id="${share._id}"
                data-workspace-id="${workspaceId}"
                data-secret="${secret}">
                &#8635; Regenerer
              </button>
              <button class="btn btn-sm btn-danger revoke-share-btn"
                data-share-id="${share._id}"
                data-workspace-id="${workspaceId}"
                data-secret="${secret}">
                &#10005; Revoquer
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
    sharesList.innerHTML = '<div class="alert alert-error"><span class="alert-icon">\u2717</span><span>Erreur reseau.</span></div>';
  }
}

async function regenerateShare(btn) {
  const shareId = btn.dataset.shareId;
  const workspaceId = btn.dataset.workspaceId;
  const secret = btn.dataset.secret;

  try {
    const res = await fetch(`/api/shares/${shareId}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, workspaceId }),
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Erreur.', 'error');
      return;
    }

    // Show regenerate modal
    const modal = document.getElementById('regenerate-modal');
    document.getElementById('regenerate-secret-display').textContent = data.secret;
    modal.classList.remove('hidden');

    document.getElementById('copy-regenerate-secret').onclick = () => {
      copyToClipboard(data.secret, 'regenerate-copy-feedback');
    };

    document.getElementById('close-regenerate-modal').onclick = () => {
      modal.classList.add('hidden');
      loadShares(workspaceId, secret);
    };
  } catch (err) {
    showToast('Erreur reseau.', 'error');
  }
}

async function revokeShare(btn) {
  if (!confirm('Revoquer ce secret de partage ?')) return;

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
      showToast('Secret revoque avec succes.', 'success');
      loadShares(workspaceId, secret);
    } else {
      const data = await res.json();
      showToast(data.error || 'Erreur.', 'error');
    }
  } catch (err) {
    showToast('Erreur reseau.', 'error');
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
      showToast('Secret colle.', 'success', 2000);
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
      feedback.textContent = 'Copie !';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    }
    showToast('Copie dans le presse-papiers.', 'success', 2000);
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
      feedback.textContent = 'Copie !';
      setTimeout(() => { feedback.textContent = ''; }, 3000);
    }
    showToast('Copie dans le presse-papiers.', 'success', 2000);
  });
}
