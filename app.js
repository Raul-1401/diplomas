// ===== DOM Elements =====
const studentNameInput = document.getElementById('studentName');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const nameOverlay = document.getElementById('nameOverlay');
const charCount = document.getElementById('charCount');
const diplomaPreview = document.getElementById('diplomaPreview');
const diplomaImage = document.getElementById('diplomaImage');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');

// ===== State =====
let currentName = '';
let imageBase64 = null;

// ===== Initialize =====
function init() {
    // Convert image to base64 for PDF generation (avoids CORS issues)
    convertImageToBase64();

    // Event listeners
    studentNameInput.addEventListener('input', handleNameInput);
    downloadBtn.addEventListener('click', generatePDF);
    resetBtn.addEventListener('click', resetForm);

    // Initial button state
    updateDownloadButton();
}

// ===== Convert image to base64 =====
function convertImageToBase64() {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        imageBase64 = canvas.toDataURL('image/png');
    };
    img.src = diplomaImage.src;
}

// ===== Event Handlers =====
function handleNameInput(e) {
    const name = e.target.value.trim();
    currentName = name;

    // Update character counter
    charCount.textContent = e.target.value.length;

    // Update preview
    if (name) {
        nameOverlay.textContent = name;
        nameOverlay.style.opacity = '1';
    } else {
        nameOverlay.textContent = 'Nombre del Alumno';
        nameOverlay.style.opacity = '0.5';
    }

    // Adjust font size based on name length
    adjustNameFontSize(name);

    updateDownloadButton();
}

function adjustNameFontSize(name) {
    // Adjust font size based on name length to fit within diploma
    const length = name.length;
    let fontSize;

    if (length <= 20) {
        fontSize = 'clamp(1.8rem, 4vw, 3rem)';
    } else if (length <= 30) {
        fontSize = 'clamp(1.5rem, 3.5vw, 2.6rem)';
    } else if (length <= 40) {
        fontSize = 'clamp(1.2rem, 3vw, 2.2rem)';
    } else {
        fontSize = 'clamp(1rem, 2.5vw, 1.8rem)';
    }

    nameOverlay.style.fontSize = fontSize;
}

function updateDownloadButton() {
    downloadBtn.disabled = !currentName;
}

function resetForm() {
    studentNameInput.value = '';
    currentName = '';
    charCount.textContent = '0';
    nameOverlay.textContent = 'Nombre del Alumno';
    nameOverlay.style.opacity = '0.5';
    nameOverlay.style.fontSize = 'clamp(1.8rem, 4vw, 3rem)';
    updateDownloadButton();

    // Focus on name input
    studentNameInput.focus();
}

// ===== PDF Generation =====
async function generatePDF() {
    if (!currentName) return;

    showLoading(true);

    try {
        // Wait a bit for UI update
        await new Promise(resolve => setTimeout(resolve, 100));

        const { jsPDF } = window.jspdf;

        // Get the diploma wrapper dimensions
        const wrapper = diplomaPreview;
        const diplomaImg = diplomaImage;

        // Create a canvas to draw the final diploma
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use the original image dimensions
        const img = new Image();
        img.src = imageBase64 || diplomaImg.src;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // Set canvas size to image size
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Draw the diploma background
        ctx.drawImage(img, 0, 0);

        // Draw the name text
        ctx.save();

        // Calculate font size relative to image size
        const baseFontSize = img.naturalWidth * 0.045;
        const nameLength = currentName.length;
        let fontSize;

        if (nameLength <= 20) {
            fontSize = baseFontSize;
        } else if (nameLength <= 30) {
            fontSize = baseFontSize * 0.85;
        } else if (nameLength <= 40) {
            fontSize = baseFontSize * 0.7;
        } else {
            fontSize = baseFontSize * 0.55;
        }

        ctx.font = `${fontSize}px 'Great Vibes', cursive`;
        ctx.fillStyle = '#2c5282';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Position for name (60% from top, center horizontally)
        const nameX = canvas.width / 2;
        const nameY = canvas.height * 0.60;

        // Add subtle shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(currentName, nameX, nameY);

        // Draw underline
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        const textWidth = ctx.measureText(currentName).width;
        const underlineY = nameY + fontSize * 0.4;
        ctx.beginPath();
        ctx.strokeStyle = '#2c5282';
        ctx.lineWidth = 1;
        ctx.moveTo(nameX - textWidth / 2, underlineY);
        ctx.lineTo(nameX + textWidth / 2, underlineY);
        ctx.stroke();

        ctx.restore();

        // Create PDF
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;

        // Create PDF in landscape orientation
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'letter'
        });

        // Get PDF dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate dimensions to fit the image
        let finalWidth, finalHeight;
        const pageRatio = pdfWidth / pdfHeight;

        if (ratio > pageRatio) {
            finalWidth = pdfWidth - 10;
            finalHeight = finalWidth / ratio;
        } else {
            finalHeight = pdfHeight - 10;
            finalWidth = finalHeight * ratio;
        }

        // Center the image
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

        // Generate filename
        const sanitizedName = currentName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z\s]/g, '')
            .replace(/\s+/g, '_');
        const filename = `Diploma_${sanitizedName}.pdf`;

        // Download PDF
        pdf.save(filename);

        showToast();
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error al generar el PDF. Por favor intenta de nuevo.\n\nError: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ===== UI Helpers =====
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showToast() {
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ===== Initialize on DOM Ready =====
document.addEventListener('DOMContentLoaded', init);
