// Global state variables
console.log('WhatsApp Bulk Sender script loaded successfully!');
let clickedNumbers = new Set();
let allNumbers = [];
let autoNextEnabled = true;
let selectedTemplate = '';
let customMessage = '';
let editingTemplateKey = null;
let contactsWithNames = new Map();
let sessionStartTime = null;
let sessionTimer = null;

// Default message templates
const defaultTemplates = {
  greeting: { name: "Friendly Greeting", emoji: "👋", message: "Hi! Hope you're having a great day! 😊" },
  'follow-up': { name: "Follow-up Message", emoji: "📞", message: "Hi! Just following up on our previous conversation. Looking forward to hearing from you!" },
  business: { name: "Business Inquiry", emoji: "💼", message: "Hello! I hope this message finds you well. I wanted to reach out regarding a potential business opportunity." },
  reminder: { name: "Gentle Reminder", emoji: "⏰", message: "Hi! Just a gentle reminder about our upcoming meeting/event. Please let me know if you have any questions!" },
  'thank-you': { name: "Thank You Note", emoji: "🙏", message: "Thank you so much for your time and support! It means a lot to me. 🙏" },
  invitation: { name: "Event Invitation", emoji: "🎉", message: "Hi! You're invited to our special event! Would love to have you join us. Details to follow! 🎉" }
};

// Template management functions
function loadCustomTemplates() {
  const saved = localStorage.getItem('whatsapp_custom_templates');
  return saved ? JSON.parse(saved) : {};
}

function saveCustomTemplates(templates) {
  localStorage.setItem('whatsapp_custom_templates', JSON.stringify(templates));
}

function getAllTemplates() {
  const customTemplates = loadCustomTemplates();
  return { ...defaultTemplates, ...customTemplates };
}

function rebuildTemplateSelect() {
  const select = document.getElementById('templateSelect');
  const currentValue = select.value;
  
  select.innerHTML = '<option value="">Select a template (optional)</option>';
  
  const allTemplates = getAllTemplates();
  
  Object.keys(allTemplates).forEach(key => {
    const template = allTemplates[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${template.emoji} ${template.name}`;
    select.appendChild(option);
  });
  
  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = '✏️ Write Custom Message';
  select.appendChild(customOption);
  
  if (currentValue && document.querySelector(`option[value="${currentValue}"]`)) {
    select.value = currentValue;
  }
}

function showAddTemplateForm() {
  editingTemplateKey = null;
  document.getElementById('templateName').value = '';
  document.getElementById('templateEmoji').value = '';
  document.getElementById('templateMessage').value = '';
  document.getElementById('saveTemplateBtn').textContent = 'Save Template';
  document.getElementById('templateForm').classList.remove('d-none');
}

function editCurrentTemplate() {
  const allTemplates = getAllTemplates();
  const template = allTemplates[selectedTemplate];
  
  if (!template) return;
  
  editingTemplateKey = selectedTemplate;
  document.getElementById('templateName').value = template.name;
  document.getElementById('templateEmoji').value = template.emoji;
  document.getElementById('templateMessage').value = template.message;
  document.getElementById('saveTemplateBtn').textContent = 'Update Template';
  document.getElementById('templateForm').classList.remove('d-none');
}

function deleteCurrentTemplate() {
  if (!selectedTemplate || !confirm(`Are you sure you want to delete the "${getAllTemplates()[selectedTemplate].name}" template?`)) {
    return;
  }
  
  const customTemplates = loadCustomTemplates();
  if (customTemplates[selectedTemplate]) {
    delete customTemplates[selectedTemplate];
    saveCustomTemplates(customTemplates);
    rebuildTemplateSelect();
    
    document.getElementById('templateSelect').value = '';
    handleTemplateChange();
    
    showToast('Template deleted successfully! 🗑️');
  } else {
    showToast('Cannot delete built-in templates. You can only delete custom templates.', 'warning');
  }
}

function saveTemplate() {
  const name = document.getElementById('templateName').value.trim();
  const emoji = document.getElementById('templateEmoji').value.trim();
  const message = document.getElementById('templateMessage').value.trim();
  
  if (!name || !message) {
    showToast('Please fill in both template name and message.', 'error');
    return;
  }
  
  const customTemplates = loadCustomTemplates();
  
  let key = editingTemplateKey;
  if (!key) {
    key = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    let counter = 1;
    const originalKey = key;
    while (getAllTemplates()[key]) {
      key = `${originalKey}-${counter}`;
      counter++;
    }
  }
  
  customTemplates[key] = {
    name: name,
    emoji: emoji || '📝',
    message: message
  };
  
  saveCustomTemplates(customTemplates);
  rebuildTemplateSelect();
  
  document.getElementById('templateSelect').value = key;
  handleTemplateChange();
  
  cancelTemplateForm();
  
  const action = editingTemplateKey ? 'updated' : 'saved';
  showToast(`Template ${action} successfully! ✅`);
}

function cancelTemplateForm() {
  document.getElementById('templateForm').classList.add('d-none');
  editingTemplateKey = null;
}

function updateTemplateButtons() {
  const editBtn = document.getElementById('editTemplateBtn');
  const deleteBtn = document.getElementById('deleteTemplateBtn');
  
  if (selectedTemplate && selectedTemplate !== 'custom') {
    editBtn.classList.remove('d-none');
    
    const customTemplates = loadCustomTemplates();
    if (customTemplates[selectedTemplate]) {
      deleteBtn.classList.remove('d-none');
    } else {
      deleteBtn.classList.add('d-none');
    }
  } else {
    editBtn.classList.add('d-none');
    deleteBtn.classList.add('d-none');
  }
}

function toggleTemplatesCollapse() {
  const content = document.getElementById('templateContent');
  const toggle = document.getElementById('templateToggle');
  
  if (content.classList.contains('d-none')) {
    content.classList.remove('d-none');
    toggle.innerHTML = '<i class="bi bi-eye-slash me-1"></i> Hide';
  } else {
    content.classList.add('d-none');
    toggle.innerHTML = '<i class="bi bi-eye me-1"></i> Show';
  }
}

function handleTemplateChange() {
  const select = document.getElementById('templateSelect');
  const preview = document.getElementById('templatePreview');
  const customTextarea = document.getElementById('customTemplate');
  
  selectedTemplate = select.value;
  
  if (selectedTemplate === 'custom') {
    customTextarea.classList.remove('d-none');
    preview.classList.add('d-none');
  } else {
    customTextarea.classList.add('d-none');
    
    if (selectedTemplate) {
      const allTemplates = getAllTemplates();
      const template = allTemplates[selectedTemplate];
      
      if (template) {
        preview.innerHTML = `<strong>Preview:</strong><br>"${template.message}"`;
        preview.classList.remove('d-none');
      }
    } else {
      preview.classList.add('d-none');
    }
  }
  
  updateTemplateButtons();
  updateStepper('template');
}

function updateCustomTemplate() {
  customMessage = document.getElementById('customTemplate').value;
}

function getCurrentMessage() {
  if (selectedTemplate === 'custom') {
    return customMessage;
  } else if (selectedTemplate) {
    const allTemplates = getAllTemplates();
    const template = allTemplates[selectedTemplate];
    return template ? template.message : '';
  }
  return '';
}

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
  const toastEl = document.getElementById('liveToast');
  const toastBody = document.getElementById('toastBody');
  
  const icons = {
    success: 'bi-check-circle-fill text-success',
    error: 'bi-exclamation-triangle-fill text-danger',
    warning: 'bi-exclamation-circle-fill text-warning',
    info: 'bi-info-circle-fill text-info'
  };
  
  const icon = icons[type] || icons.success;
  
  toastBody.innerHTML = `
    <i class="bi ${icon} me-2"></i>
    <span>${message}</span>
  `;
  
  const toast = new bootstrap.Toast(toastEl, { delay: duration });
  toast.show();
}

// Stepper functionality
function updateStepper(phase) {
  const steps = ['input', 'template', 'progress', 'report'];
  steps.forEach((step, idx) => {
    const el = document.getElementById('step-' + step);
    el.classList.remove('step-active', 'step-completed', 'step-pending');
    if (steps.indexOf(phase) > idx) {
      el.classList.add('step-completed');
    } else if (steps.indexOf(phase) === idx) {
      el.classList.add('step-active');
    } else {
      el.classList.add('step-pending');
    }
  });
}

// Contact parsing and enhancement
function parseContactsWithNames(input) {
  const lines = input.split(/[\n,]+/).map(line => line.trim()).filter(line => line);
  const numbers = [];
  
  contactsWithNames.clear();
  
  lines.forEach(line => {
    if (line.includes(',')) {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const number = parts[1];
        if (/^601\d{7,9}$/.test(number)) {
          contactsWithNames.set(number, name);
          numbers.push(number);
        }
      }
    } else {
      const cleanNumber = line.replace(/\D/g, '');
      if (/^601\d{7,9}$/.test(cleanNumber)) {
        numbers.push(cleanNumber);
      }
    }
  });
  
  return numbers;
}

function updateCounter() {
  const input = document.getElementById('phoneInput').value;
  const numbers = parseContactsWithNames(input);
  const validCount = numbers.filter(num => /^601\d{7,9}$/.test(num)).length;
  document.getElementById('counter').textContent = `${validCount} numbers`;
  
  if (validCount > 0) {
    updateStepper('input');
  }
}

function handleKeyDown(event) {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    generateLinks();
  }
}

// CSV Import functionality
function importFromCSV() {
  document.getElementById('csvFileInput').click();
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    const importedData = [];
    lines.forEach(line => {
      const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
      if (parts.length >= 2) {
        const name = parts[0];
        const number = parts[1].replace(/\D/g, '');
        if (/^601\d{7,9}$/.test(number)) {
          importedData.push(`${name}, ${number}`);
        }
      } else if (parts.length === 1) {
        const number = parts[0].replace(/\D/g, '');
        if (/^601\d{7,9}$/.test(number)) {
          importedData.push(number);
        }
      }
    });
    
    const phoneInput = document.getElementById('phoneInput');
    const existingText = phoneInput.value.trim();
    const newText = existingText ? `${existingText}\n${importedData.join('\n')}` : importedData.join('\n');
    
    phoneInput.value = newText;
    updateCounter();
    
    showToast(`Imported ${importedData.length} contacts from CSV file! 📁`);
  };
  
  reader.readAsText(file);
  event.target.value = '';
}

function showSampleFormat() {
  const sample = `John Doe, 60123456789
Mary Smith, 60111234567
60133334444
Ahmad Hassan, 60155667788`;
  
  showToast('Sample format copied to clipboard! Check console for details.', 'info');
  console.log('Sample CSV/contact format:\n' + sample);
  
  // Try to copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(sample).catch(() => {});
  }
}

function enhanceContacts() {
  const input = document.getElementById('phoneInput').value;
  const numbers = parseContactsWithNames(input);
  
  if (numbers.length === 0) {
    showToast('Please enter some phone numbers first.', 'warning');
    return;
  }
  
  const enhancedList = document.getElementById('enhancedContactsList');
  const preview = document.getElementById('contactsPreview');
  
  let previewHTML = '';
  numbers.forEach((number, index) => {
    const name = contactsWithNames.get(number) || `Contact ${index + 1}`;
    previewHTML += `<div class="enhanced-contact">
      <span class="contact-name">${name}</span> - 
      <span class="contact-number">${number}</span>
    </div>`;
  });
  
  preview.innerHTML = previewHTML;
  enhancedList.classList.remove('d-none');
  
  showToast('Contact preview updated! Names will be shown in the contact cards.', 'info');
}

// Progress and session management
function loadSavedProgress() {
  const saved = localStorage.getItem('whatsapp_progress');
  if (saved) {
    const data = JSON.parse(saved);
    clickedNumbers = new Set(data.clickedNumbers || []);
    sessionStartTime = data.sessionStartTime || Date.now();
    
    if (data.sessionStartTime) {
      startSessionTimer();
    }
  }
}

function saveBulkProgress() {
  const progressData = {
    clickedNumbers: Array.from(clickedNumbers),
    sessionStartTime: sessionStartTime,
    timestamp: Date.now()
  };
  localStorage.setItem('whatsapp_progress', JSON.stringify(progressData));
}

function startSessionTimer() {
  if (sessionTimer) clearInterval(sessionTimer);
  
  sessionTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000 / 60);
    document.getElementById('statTime').textContent = `${elapsed}m`;
  }, 1000);
}

function updateProgress() {
  const total = allNumbers.length;
  const completed = clickedNumbers.size;
  const remaining = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statRemaining').textContent = remaining;
  document.getElementById('progressPercentage').textContent = `${percentage}%`;
  document.getElementById('progressFill').style.width = `${percentage}%`;
  
  if (completed === 0) {
    document.getElementById('progressText').textContent = 'Ready to start messaging';
  } else if (completed === total) {
    document.getElementById('progressText').textContent = 'All contacts completed! 🎉';
    updateStepper('report');
    showCompletionAnimation();
  } else {
    document.getElementById('progressText').textContent = `${completed} of ${total} contacts messaged`;
    updateStepper('progress');
  }
  
  saveBulkProgress();
}

function updateNextSuggestion() {
  if (!autoNextEnabled) return;
  
  document.querySelectorAll('.contact-card').forEach(card => {
    card.classList.remove('contact-next');
  });
  
  const nextNumber = allNumbers.find(num => !clickedNumbers.has(num));
  if (nextNumber) {
    const nextCard = document.querySelector(`[data-number="${nextNumber}"]`);
    if (nextCard) {
      nextCard.classList.add('contact-next');
      nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function resetProgress() {
  if (!confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
    return;
  }
  
  clickedNumbers.clear();
  localStorage.removeItem('whatsapp_progress');
  
  document.querySelectorAll('.contact-card').forEach(card => {
    card.classList.remove('contact-completed', 'contact-next');
    const button = card.querySelector('button');
    const icon = card.querySelector('.bi');
    
    button.classList.remove('btn-success');
    button.classList.add('btn-outline-success');
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-chat-dots"></i> Send Message';
    icon.className = 'bi bi-whatsapp text-success';
  });
  
  updateProgress();
  updateNextSuggestion();
  
  showToast('Progress reset successfully! 🔄');
}

function markAllDone() {
  if (!confirm('Are you sure you want to mark all contacts as completed?')) {
    return;
  }
  
  allNumbers.forEach(number => clickedNumbers.add(number));
  
  document.querySelectorAll('.contact-card').forEach(card => {
    card.classList.add('contact-completed');
    card.classList.remove('contact-next');
    const button = card.querySelector('button');
    const icon = card.querySelector('.bi');
    
    button.classList.remove('btn-outline-success');
    button.classList.add('btn-success');
    button.disabled = true;
    button.innerHTML = '<i class="bi bi-check"></i> Sent';
    icon.className = 'bi bi-check-circle-fill text-success';
  });
  
  updateProgress();
  showToast('All contacts marked as completed! ✅');
}

function toggleAutoNext() {
  autoNextEnabled = !autoNextEnabled;
  const btn = document.getElementById('autoNextBtn');
  
  if (autoNextEnabled) {
    btn.classList.add('active');
    btn.innerHTML = '<i class="bi bi-lightning me-1"></i> Auto-suggest Next';
    updateNextSuggestion();
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<i class="bi bi-lightning me-1"></i> Manual Mode';
    document.querySelectorAll('.contact-card').forEach(card => {
      card.classList.remove('contact-next');
    });
  }
}

function exportProgress() {
  const data = {
    sessionDate: new Date().toLocaleDateString(),
    sessionTime: new Date().toLocaleTimeString(),
    totalContacts: allNumbers.length,
    completedContacts: clickedNumbers.size,
    remainingContacts: allNumbers.length - clickedNumbers.size,
    completionRate: allNumbers.length > 0 ? Math.round((clickedNumbers.size / allNumbers.length) * 100) : 0,
    sessionDuration: sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000 / 60) : 0,
    completedNumbers: Array.from(clickedNumbers),
    pendingNumbers: allNumbers.filter(num => !clickedNumbers.has(num))
  };
  
  const report = `WhatsApp Bulk Sender - Session Report
Generated on: ${data.sessionDate} at ${data.sessionTime}

📊 SUMMARY
Total Contacts: ${data.totalContacts}
Completed: ${data.completedContacts}
Remaining: ${data.remainingContacts}
Completion Rate: ${data.completionRate}%
Session Duration: ${data.sessionDuration} minutes

✅ COMPLETED CONTACTS
${data.completedNumbers.map(num => {
    const name = contactsWithNames.get(num);
    return name ? `${name} (${num})` : num;
  }).join('\n')}

⏳ PENDING CONTACTS
${data.pendingNumbers.map(num => {
    const name = contactsWithNames.get(num);
    return name ? `${name} (${num})` : num;
  }).join('\n')}

Generated by WhatsApp Bulk Sender
`;
  
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whatsapp-session-report-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Session report exported successfully! 📄');
}

// Button loading state
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('btn-loading');
    button.disabled = true;
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
  }
}

// Completion animation
function showCompletionAnimation() {
  const container = document.getElementById('confettiContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDelay = Math.random() * 3 + 's';
    piece.style.backgroundColor = ['#25d366', '#128c7e', '#34d399', '#10b981'][Math.floor(Math.random() * 4)];
    container.appendChild(piece);
  }
  
  setTimeout(() => {
    container.innerHTML = '';
  }, 4000);
}

// WhatsApp link generation and opening
function openWhatsApp(phoneNumber, button) {
  if (clickedNumbers.has(phoneNumber)) return;
  
  const message = getCurrentMessage();
  const encodedMessage = encodeURIComponent(message);
  
  // Start session timer if not already started
  if (!sessionStartTime) {
    sessionStartTime = Date.now();
    startSessionTimer();
  }
  
  // Mark as clicked
  clickedNumbers.add(phoneNumber);
  
  // Update button state
  button.classList.remove('btn-outline-success');
  button.classList.add('btn-success');
  button.disabled = true;
  button.innerHTML = '<i class="bi bi-check"></i> Sent';
  
  // Update card state
  const card = button.closest('.contact-card');
  card.classList.add('contact-completed', 'success-animation');
  card.classList.remove('contact-next');
  
  // Update icon in card header
  const icon = card.querySelector('.card-body .bi');
  if (icon) {
    icon.className = 'bi bi-check-circle-fill text-success';
  }
  
  // Update progress
  updateProgress();
  updateNextSuggestion();
  
  // Construct WhatsApp URLs
  const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
  const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
  const waUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  
  // Try to open WhatsApp app first, then fallback to web
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // On mobile, try app first
    window.location.href = whatsappUrl;
    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 1000);
  } else {
    // On desktop, open web WhatsApp
    window.open(webWhatsappUrl, '_blank');
  }
  
  showToast(`Opening WhatsApp for ${contactsWithNames.get(phoneNumber) || phoneNumber}! 📱`);
}

// Main contact generation function
function generateLinks() {
  const input = document.getElementById('phoneInput').value;
  const outputDiv = document.getElementById('output');
  const generateBtn = document.getElementById('generateBtn');
  
  setButtonLoading(generateBtn, true);
  outputDiv.innerHTML = '';

  const allEntries = parseContactsWithNames(input);
  const validNumbers = allEntries.filter(num => /^601\d{7,9}$/.test(num));
  const invalidNumbers = allEntries.filter(num => !(/^601\d{7,9}$/.test(num)));

  setTimeout(() => {
    setButtonLoading(generateBtn, false);
    
    if (allEntries.length === 0) {
      outputDiv.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>No numbers found!</strong> Please enter at least one phone number to get started.
          </div>
        </div>
      `;
      return;
    }

    if (validNumbers.length === 0) {
      outputDiv.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <i class="bi bi-x-circle me-2"></i>
            <strong>No valid numbers found.</strong><br>
            <strong>Required format:</strong> Malaysian numbers starting with 601<br>
            <strong>Examples:</strong> 60123456789, 60112345678
          </div>
        </div>
      `;
      return;
    }

    // Show success message
    if (validNumbers.length > 0) {
      let successMessage = `✅ Generated ${validNumbers.length} WhatsApp link${validNumbers.length !== 1 ? 's' : ''} successfully!`;
      if (invalidNumbers.length > 0) {
        successMessage += ` (${invalidNumbers.length} invalid number${invalidNumbers.length !== 1 ? 's' : ''} skipped)`;
      }
      
      outputDiv.innerHTML = `
        <div class="col-12">
          <div class="alert alert-success">
            <i class="bi bi-check-circle me-2"></i>
            ${successMessage}
          </div>
        </div>
      `;
      
      // Show progress section
      document.getElementById('progressSection').classList.remove('d-none');
      allNumbers = [...validNumbers];
      
      // Load saved progress
      loadSavedProgress();
    }

    // Generate contact cards
    validNumbers.forEach((number, index) => {
      const name = contactsWithNames.get(number);
      const displayText = name ? name : `Contact ${index + 1}`;
      const isCompleted = clickedNumbers.has(number);
      
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      
      const contactClass = isCompleted ? 'contact-completed' : 
                          (index === 0 && !isCompleted && autoNextEnabled) ? 'contact-next' : '';
      
      col.innerHTML = `
        <div class="contact-card card h-100 hover-lift ${contactClass}" data-number="${number}">
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-center mb-3">
              <div class="me-2">
                ${isCompleted ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-whatsapp text-success"></i>'}
              </div>
              <div class="flex-grow-1">
                <h6 class="card-title mb-0 fw-semibold">${displayText}</h6>
                <small class="text-muted">${number}</small>
              </div>
            </div>
            <button class="btn ${isCompleted ? 'btn-success' : 'btn-outline-success'} btn-contact mt-auto fw-medium" 
                    onclick="openWhatsApp('${number}', this)" 
                    ${isCompleted ? 'disabled' : ''}>
              <i class="bi bi-${isCompleted ? 'check' : 'chat-dots'} me-1"></i>
              ${isCompleted ? 'Sent' : 'Send Message'}
            </button>
          </div>
        </div>
      `;
      
      outputDiv.appendChild(col);
    });
    
    // Show invalid numbers if any
    if (invalidNumbers.length > 0) {
      const invalidCol = document.createElement('div');
      invalidCol.className = 'col-12 mt-3';
      invalidCol.innerHTML = `
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Invalid numbers skipped (${invalidNumbers.length}):</strong><br>
          <small class="text-muted">${invalidNumbers.join(', ')}</small><br>
          <small class="text-muted">Make sure numbers start with 601 and have 10-12 digits total</small>
        </div>
      `;
      outputDiv.appendChild(invalidCol);
    }
    
    // Update progress and suggestions
    updateProgress();
    updateNextSuggestion();
    updateStepper('progress');
  }, 500);
}

// Test function to verify JavaScript is working
function testJS() {
  alert('JavaScript is working! Script loaded successfully.');
  console.log('Test function called - JavaScript is working!');
}

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - initializing app...');
  updateCounter();
  loadSavedProgress();
  rebuildTemplateSelect();
  updateStepper('input');
  console.log('App initialization complete!');
});
