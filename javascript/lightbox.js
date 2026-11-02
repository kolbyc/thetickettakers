// Click a poster, band photo or gallery image to view it larger.

const CLICKABLE_IMAGES = '.ticket-images img, .about-us-images img, .gallery-item img';

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-img');
const closeButton = lightbox.querySelector('.lightbox-close');

let elementToRefocus = null;

function openLightbox(thumbnail) {
    elementToRefocus = document.activeElement;

    // The build step stores a large optimized variant in data-full.
    // Without it (e.g. opening the source file directly) fall back to what is on screen.
    lightboxImage.src = thumbnail.dataset.full || thumbnail.currentSrc || thumbnail.src;
    lightboxImage.alt = thumbnail.alt;

    lightbox.classList.add('is-open');
    document.body.classList.add('lightbox-open');
    closeButton.focus();
}

function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    lightboxImage.removeAttribute('src');

    if (elementToRefocus) elementToRefocus.focus();
}

// Make thumbnails reachable and operable by keyboard.
document.querySelectorAll(CLICKABLE_IMAGES).forEach((thumbnail) => {
    thumbnail.tabIndex = 0;
    thumbnail.setAttribute('role', 'button');
    thumbnail.setAttribute('aria-label', `View larger: ${thumbnail.alt}`);
});

document.addEventListener('click', (event) => {
    const thumbnail = event.target.closest(CLICKABLE_IMAGES);
    if (thumbnail) openLightbox(thumbnail);
});

document.addEventListener('keydown', (event) => {
    const isOpen = lightbox.classList.contains('is-open');

    if (event.key === 'Escape' && isOpen) {
        closeLightbox();
        return;
    }

    const isActivationKey = event.key === 'Enter' || event.key === ' ';
    const thumbnail = event.target.closest?.(CLICKABLE_IMAGES);
    if (isActivationKey && thumbnail) {
        event.preventDefault();
        openLightbox(thumbnail);
    }
});

closeButton.addEventListener('click', closeLightbox);

// Clicking the dark backdrop (but not the image itself) also closes it.
lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
});
