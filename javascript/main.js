// Show or hide the "Back to Top" button based on scroll position
window.onscroll = function() {
    var backToTopButton = document.getElementById("backToTopButton");
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        backToTopButton.style.display = "block";
    } else {
        backToTopButton.style.display = "none";
    }
};

// Scroll smoothly back to top when the button is clicked
document.getElementById("backToTopButton").onclick = function(event) {
    event.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
};

