// ===== DOM Elements =====
const studentNameInput = document.getElementById('studentName');
const levelSelect = document.getElementById('levelSelect');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const nameOverlay = document.getElementById('nameOverlay');
const charCount = document.getElementById('charCount');
const diplomaPreview = document.getElementById('diplomaPreview');
const diplomaImage = document.getElementById('diplomaImage');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const loadingProgress = document.getElementById('loadingProgress');
const loadingProgressBar = document.getElementById('loadingProgressBar');
const toast = document.getElementById('toast');

// ===== Configuration =====
// Proporciones para el tamaño de fuente (relativos al ancho de la imagen)
const FONT_SIZE_MAX_RATIO = 0.7;  // 5.5% del ancho
const FONT_SIZE_MIN_RATIO = 0.018; // 1.8% del ancho
const AVAILABLE_WIDTH_RATIO = 0.68; // 68% del ancho para el nombre

// Lista de imágenes a precargar
const DIPLOMA_IMAGES = ['1.png', '2.png', '3.png'];

// Cache de imágenes en base64
const imageCache = {};

// Configuración de optimización de imagen
const IMAGE_OPTIMIZATION = {
    enabled: true,       // Activar/desactivar optimización
    maxWidth: 2500,      // Ancho máximo en píxeles (original: 6250)
    quality: 0.85,       // Calidad JPEG (0.0 a 1.0)
    format: 'image/jpeg' // Formato: 'image/jpeg' para menor tamaño, 'image/png' para calidad máxima
};

// ===== State =====
let currentName = '';
let currentLevel = '1.png';
let imagesLoaded = false;

// ===== Initialize =====
async function init() {
    // Mostrar pantalla de carga inicial
    showLoading(true, 'Cargando recursos...', true);

    try {
        // Precargar todas las imágenes
        await preloadAllImages();

        // Event listeners
        studentNameInput.addEventListener('input', handleNameInput);
        levelSelect.addEventListener('change', handleLevelChange);
        downloadBtn.addEventListener('click', generatePDF);
        resetBtn.addEventListener('click', resetForm);

        // Initial button state
        updateDownloadButton();

        imagesLoaded = true;
    } catch (error) {
        console.error('Error loading images:', error);
        alert('Error al cargar las imágenes. Por favor recarga la página.');
    } finally {
        showLoading(false);
    }
}

// ===== Preload All Images =====
async function preloadAllImages() {
    const totalImages = DIPLOMA_IMAGES.length;
    let loadedCount = 0;

    updateProgress(0, totalImages);

    const loadPromises = DIPLOMA_IMAGES.map(async (imageName, index) => {
        try {
            const base64 = await loadAndConvertImage(imageName);
            imageCache[imageName] = base64;
            loadedCount++;
            updateProgress(loadedCount, totalImages);
        } catch (error) {
            console.error(`Error loading ${imageName}:`, error);
            throw error;
        }
    });

    await Promise.all(loadPromises);
}

// ===== Load and Convert Single Image =====
function loadAndConvertImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = function () {
            const canvas = document.createElement('canvas');

            // Calcular dimensiones (optimizar si está habilitado)
            let targetWidth = img.naturalWidth;
            let targetHeight = img.naturalHeight;

            if (IMAGE_OPTIMIZATION.enabled && img.naturalWidth > IMAGE_OPTIMIZATION.maxWidth) {
                const scale = IMAGE_OPTIMIZATION.maxWidth / img.naturalWidth;
                targetWidth = IMAGE_OPTIMIZATION.maxWidth;
                targetHeight = Math.round(img.naturalHeight * scale);
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            // Usar formato y calidad configurados
            let base64;
            if (IMAGE_OPTIMIZATION.enabled) {
                base64 = canvas.toDataURL(IMAGE_OPTIMIZATION.format, IMAGE_OPTIMIZATION.quality);
            } else {
                base64 = canvas.toDataURL('image/png');
            }

            resolve(base64);
        };

        img.onerror = () => reject(new Error(`Failed to load image: ${imageSrc}`));
        img.src = imageSrc;
    });
}

// ===== Update Progress Bar =====
function updateProgress(loaded, total) {
    const percentage = Math.round((loaded / total) * 100);
    if (loadingProgressBar) {
        loadingProgressBar.style.width = `${percentage}%`;
    }
    if (loadingText) {
        loadingText.textContent = `Cargando imágenes... ${loaded}/${total}`;
    }
}

// ===== Helper Functions =====
function toTitleCase(str) {
    // Convierte a Title Case: primera letra de cada palabra en mayúscula, resto en minúsculas
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// ===== Event Handlers =====
function handleNameInput(e) {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    const originalValue = input.value;

    // Aplicar formato Title Case
    const formattedValue = toTitleCase(originalValue);

    // Solo actualizar si cambió el valor (evita bucles)
    if (formattedValue !== originalValue) {
        input.value = formattedValue;
        // Restaurar posición del cursor
        input.setSelectionRange(cursorPosition, cursorPosition);
    }

    const name = formattedValue.trim();
    currentName = name;

    // Update character counter
    charCount.textContent = formattedValue.length;

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
    if (!name) {
        nameOverlay.style.fontSize = '2.5rem';
        return;
    }

    // Obtener el ancho del contenedor del diploma para calcular proporciones
    const diplomaWrapper = document.getElementById('diplomaPreview');
    const wrapperWidth = diplomaWrapper.offsetWidth;
    const availableWidth = wrapperWidth * AVAILABLE_WIDTH_RATIO;

    // Tamaño máximo y mínimo de fuente proporcionales al contenedor
    const maxFontSize = wrapperWidth * FONT_SIZE_MAX_RATIO;
    const minFontSize = wrapperWidth * FONT_SIZE_MIN_RATIO;

    // Crear un canvas temporal para medir el texto
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let fontSize = maxFontSize;

    // Reducir el tamaño de fuente hasta que el texto quepa
    while (fontSize > minFontSize) {
        ctx.font = `${fontSize}px 'Great Vibes', cursive`;
        const textWidth = ctx.measureText(name).width;

        if (textWidth <= availableWidth) {
            break;
        }
        fontSize -= 1;
    }

    nameOverlay.style.fontSize = `${fontSize}px`;
}

function handleLevelChange(e) {
    currentLevel = e.target.value;
    diplomaImage.src = currentLevel;
}

function updateDownloadButton() {
    downloadBtn.disabled = !currentName;
}

function resetForm() {
    studentNameInput.value = '';
    levelSelect.value = '1.png';
    currentName = '';
    currentLevel = '1.png';
    charCount.textContent = '0';
    nameOverlay.textContent = 'Nombre del Alumno';
    nameOverlay.style.opacity = '0.5';
    nameOverlay.style.fontSize = 'clamp(1.8rem, 4vw, 3rem)';
    diplomaImage.src = '1.png';
    updateDownloadButton();

    // Focus on name input
    studentNameInput.focus();
}

// ===== PDF Generation =====
async function generatePDF() {
    if (!currentName) return;

    showLoading(true, 'Generando PDF...');

    try {
        // Wait a bit for UI update
        await new Promise(resolve => setTimeout(resolve, 100));

        const { jsPDF } = window.jspdf;

        // Create a canvas to draw the final diploma
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use the cached base64 image
        const img = new Image();
        img.src = imageCache[currentLevel] || diplomaImage.src;

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

        // Calculate font size usando las mismas proporciones que la previsualización
        const availableWidth = canvas.width * AVAILABLE_WIDTH_RATIO;
        const maxFontSize = canvas.width * FONT_SIZE_MAX_RATIO;
        const minFontSize = canvas.width * FONT_SIZE_MIN_RATIO;

        let fontSize = maxFontSize;

        // Reducir el tamaño de fuente hasta que el texto quepa
        while (fontSize > minFontSize) {
            ctx.font = `${fontSize}px 'Great Vibes', cursive`;
            const textWidth = ctx.measureText(currentName).width;

            if (textWidth <= availableWidth) {
                break;
            }
            fontSize -= 1;
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
        const underlineY = nameY + fontSize * 0.35;
        ctx.beginPath();
        ctx.strokeStyle = '#2c5282';
        ctx.lineWidth = 2;
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

        // Fill entire page with image (no margins)
        let finalWidth, finalHeight;
        const pageRatio = pdfWidth / pdfHeight;

        if (ratio > pageRatio) {
            // Image is wider - fit to width
            finalWidth = pdfWidth;
            finalHeight = finalWidth / ratio;
        } else {
            // Image is taller - fit to height
            finalHeight = pdfHeight;
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
function showLoading(show, message = 'Generando PDF...', showProgress = false) {
    if (show) {
        if (loadingText) loadingText.textContent = message;
        if (loadingProgress) {
            loadingProgress.style.display = showProgress ? 'block' : 'none';
            if (loadingProgressBar) loadingProgressBar.style.width = '0%';
        }
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
