// Mobile menu, back-to-top button and footer year.

const SHOW_BACK_TO_TOP_AFTER_PX = 200;

const menuButton = document.querySelector('.menu-icon');
const menu = document.getElementById('site-menu');

function setMenuOpen(isOpen) {
    menu.classList.toggle('is-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
}

menuButton.addEventListener('click', () => {
    setMenuOpen(!menu.classList.contains('is-open'));
});

// Close the menu after choosing a section so the page isn't left covered.
menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenuOpen(false);
});

const backToTop = document.getElementById('backToTopButton');

window.addEventListener('scroll', () => {
    const isScrolledDown = window.scrollY > SHOW_BACK_TO_TOP_AFTER_PX;
    backToTop.classList.toggle('is-visible', isScrolledDown);
}, { passive: true });

backToTop.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('year').textContent = new Date().getFullYear();
