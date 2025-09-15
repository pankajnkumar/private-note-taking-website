document.addEventListener('DOMContentLoaded', () => {

    // ---Custom Cursor Logic
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    const interactiveElements = document.querySelectorAll('a, button, input');

    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 300, fill: 'forwards' });
    });
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseover', () => {
            cursorOutline.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            cursorOutline.classList.remove('hover');
        });
    });


    // ---Card Hover Animation
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-15px) scale(1.02)';
            card.style.boxShadow = '0 25px 50px rgba(138, 43, 226, 0.3), 0 15px 30px rgba(0, 191, 255, 0.2)';
            card.style.borderColor = 'rgba(138, 43, 226, 0.5)';
            
            // Add a subtle glow effect
            card.style.background = 'rgba(255, 255, 255, 0.08)';
            
            // Animate the card content
            const cardContent = card.querySelector('.card-content');
            if (cardContent) {
                cardContent.style.transform = 'translateZ(30px)';
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
            card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            card.style.background = 'rgba(255, 255, 255, 0.05)';
            
            // Reset card content
            const cardContent = card.querySelector('.card-content');
            if (cardContent) {
                cardContent.style.transform = 'translateZ(20px)';
            }
        });

    
        // card.addEventListener('mousedown', () => {
        //     card.style.transform = 'translateY(-10px) scale(0.9)';
        // });

        // card.addEventListener('mouseup', () => {
        //     card.style.transform = 'translateY(-15px) scale(0,1)';
        // });
    });
    
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Stop observing after it's visible
                // revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the element is visible
    });
    

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    

});
