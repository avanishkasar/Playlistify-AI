// Global page transition handler with interactive background movement
(function() {
  'use strict';

  // Track current page for transition direction
  let currentPage = window.location.pathname;
  let isTransitioning = false;

  // Initialize page on load
  document.addEventListener('DOMContentLoaded', () => {
    initPageTransition();
    setupNavigationInterception();
  });

  function initPageTransition() {
    const mainContent = document.querySelector('.page-main, .page-container, main');
    if (mainContent) {
      // Add slide-in animation class
      mainContent.classList.add('page-slide-in');
      
      // Trigger background animation
      animateBackgroundOnPageLoad();
    }
  }

  function animateBackgroundOnPageLoad() {
    const gradientBg = document.querySelector('.gradient-bg');
    if (!gradientBg) return;

    // Reset and animate background
    gradientBg.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Start with slight offset for smooth entry
    gradientBg.style.transform = 'translateX(40px) scale(1.03)';
    
    // Animate to center with slight scale effect
    setTimeout(() => {
      gradientBg.style.transform = 'translateX(0) scale(1)';
    }, 50);

    // Animate blobs with staggered entrance
    const blobs = document.querySelectorAll('.gradient-blob');
    blobs.forEach((blob, index) => {
      const delay = index * 0.15;
      blob.style.animationDelay = `${index * -2}s`;
      blob.style.opacity = '0';
      blob.style.transform = `translate(${20 + index * 10}px, ${20 + index * 10}px) scale(0.9)`;
      blob.style.transition = `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`;
      
      setTimeout(() => {
        blob.style.opacity = '';
        blob.style.transform = '';
        blob.style.animation = 'blobFloat 20s ease-in-out infinite, blobSlideIn 0.8s ease-out forwards';
      }, delay * 1000);
    });
  }

  function setupNavigationInterception() {
    // Intercept all internal navigation links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      
      // Skip external links, anchors, and special links
      if (!href || 
          href.startsWith('http') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:') ||
          href.startsWith('#') ||
          link.hasAttribute('target') ||
          link.hasAttribute('download') ||
          isTransitioning) {
        return;
      }

      // Check if it's an internal page navigation
      const isInternalPage = href.endsWith('.html') || 
                            href === '/' || 
                            (!href.includes('://') && !href.startsWith('#'));

      if (isInternalPage && href !== currentPage) {
        e.preventDefault();
        handlePageTransition(href, link);
      }
    });
  }

  function handlePageTransition(href, link) {
    if (isTransitioning) return;
    isTransitioning = true;

    const gradientBg = document.querySelector('.gradient-bg');
    const mainContent = document.querySelector('.page-main, .page-container, main');
    
    // Determine transition direction based on link position or page order
    const direction = getTransitionDirection(href);
    
    // Animate current page out
    if (mainContent) {
      mainContent.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
      mainContent.style.transform = direction === 'right' ? 'translateX(-50px)' : 'translateX(50px)';
      mainContent.style.opacity = '0';
    }

    // Animate background in opposite direction with more movement
    if (gradientBg) {
      gradientBg.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      const moveAmount = 40;
      gradientBg.style.transform = direction === 'right' 
        ? `translateX(-${moveAmount}px) scale(1.02) rotate(-1deg)` 
        : `translateX(${moveAmount}px) scale(1.02) rotate(1deg)`;
      
      // Animate blobs in sync
      const blobs = document.querySelectorAll('.gradient-blob');
      blobs.forEach((blob, index) => {
        const offset = (index % 2 === 0 ? 1 : -1) * 15;
        blob.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        blob.style.transform = direction === 'right'
          ? `translate(${-offset}px, ${offset}px) scale(1.05)`
          : `translate(${offset}px, ${-offset}px) scale(1.05)`;
      });
    }

    // Navigate after animation
    setTimeout(() => {
      window.location.href = href;
    }, 400);
  }

  function getTransitionDirection(href) {
    // Simple heuristic: if going to index/home, slide right, otherwise slide left
    if (href === '/' || href === 'index.html' || href === 'app.html') {
      return 'right';
    }
    return 'left';
  }

  // Add CSS for blob slide-in animation
  if (!document.getElementById('page-transition-styles')) {
    const style = document.createElement('style');
    style.id = 'page-transition-styles';
    style.textContent = `
      @keyframes blobSlideIn {
        from {
          opacity: 0;
          transform: translate(20px, 20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translate(0, 0) scale(1);
        }
      }

      .gradient-bg {
        will-change: transform;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .page-main,
      .page-container,
      main {
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(style);
  }
})();

