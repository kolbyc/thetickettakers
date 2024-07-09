document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    document.querySelectorAll('.ticket-images img').forEach(image => {
        image.addEventListener('click', () => {
            lightbox.style.display = 'flex';
            lightboxImg.style.display = 'block';
            lightboxVideo.style.display = 'none';
            lightboxImg.src = image.src;
        });
    });
    
    document.querySelectorAll('.about-images img').forEach(image => {
        image.addEventListener('click', () => {
            lightbox.style.display = 'flex';
            lightboxImg.style.display = 'block';
            lightboxVideo.style.display = 'none';
            lightboxImg.src = image.src;
        });
    });
    
    document.querySelectorAll('.gallery-item img').forEach(image => {
        image.addEventListener('click', () => {
            lightbox.style.display = 'flex';
            lightboxImg.style.display = 'block';
            lightboxVideo.style.display = 'none';
            lightboxImg.src = image.src;
        });
    });

    document.querySelectorAll('.gallery-item video').forEach(video => {
        video.addEventListener('click', (e) => {
            e.preventDefault();
            lightbox.style.display = 'flex';
            lightboxVideo.style.display = 'block';
            lightboxImg.style.display = 'none';
            lightboxVideo.src = video.querySelector('source').src;
            lightboxVideo.play();
        });
    });

    closeBtn.addEventListener('click', () => {
        lightbox.style.display = 'none';
        lightboxImg.src = '';
        lightboxVideo.pause();
        lightboxVideo.src = '';
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
            lightboxImg.src = '';
            lightboxVideo.pause();
            lightboxVideo.src = '';
        }
    });
});
