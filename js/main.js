// js/main.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('signup-form');
    const statusDiv = document.getElementById('form-status');
    const submitBtn = form.querySelector('.btn-primary');
    const submitLabel = submitBtn.querySelector('.btn-label');
    const hiddenIframe = document.getElementById('hidden-iframe');
    let errorFlashTimer = null;
    let formSubmitted = false;

    form.addEventListener('submit', function(e) {
        // после успешной подписки повторные отправки не нужны
        if (submitBtn.classList.contains('is-success')) {
            e.preventDefault();
            return;
        }

        // Reset status
        statusDiv.className = 'form-status';
        statusDiv.textContent = '';
        statusDiv.style.display = 'none';

        // Get form data
        const email = document.getElementById('email').value.trim();

        // Basic validation
        if (!email) {
            showStatus('Пожалуйста, введите ваш email', 'error');
            e.preventDefault();
            return;
        }

        // Simple email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showStatus('Пожалуйста, введите корректный email адрес', 'error');
            e.preventDefault();
            return;
        }

        // Consent checkbox
        const consentCheckbox = document.getElementById('consent');
        if (!consentCheckbox.checked) {
            showStatus('Пожалуйста, дайте согласие на обработку персональных данных', 'error');
            e.preventDefault();
            return;
        }

        // Show submitting state
        showStatus('Отправляем...', 'success');
        submitBtn.classList.add('is-loading');
        submitBtn.disabled = true;
        formSubmitted = true;

        // Set up iframe load listener for Google Forms response
        hiddenIframe.onload = function() {
            // Google Forms returns a "Thanks" page on success
            // We can't read cross-origin content, but load = likely success
            showStatus('Спасибо! Мы сохранили ваш email и уведомим вас о запуске.', 'success');
            form.reset();
            submitBtn.classList.add('is-success');
            if (submitLabel) submitLabel.textContent = 'Вы в списке!';
            submitBtn.classList.remove('is-loading');
            submitBtn.disabled = true;

            // Clean up listener
            hiddenIframe.onload = null;
        };

        // Fallback timeout in case iframe doesn't load
        setTimeout(() => {
            if (formSubmitted && !submitBtn.classList.contains('is-success')) {
                hiddenIframe.onload = null;
                showStatus('Произошла ошибка при отправке. Пожалуйста, попробуйте ещё раз.', 'error');
                form.style.animation = 'shake 0.4s ease-in-out';
                setTimeout(() => {
                    form.style.animation = '';
                }, 400);
                submitBtn.classList.add('is-error');
                clearTimeout(errorFlashTimer);
                errorFlashTimer = setTimeout(() => {
                    submitBtn.classList.remove('is-error');
                }, 700);
                submitBtn.classList.remove('is-loading');
                submitBtn.disabled = false;
                formSubmitted = false;
            }
        }, 8000);

        // Form submits naturally to hidden iframe (no preventDefault)
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `form-status ${type}`;
        statusDiv.style.display = 'block';
    }

    // Появление формы при попадании в зону видимости: карточка всплывает,
    // затем каскадно проявляется содержимое. Без JS или при
    // prefers-reduced-motion форма просто видна сразу.
    const signupSection = document.querySelector('.signup-section');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (signupSection && !reduceMotion && 'IntersectionObserver' in window) {
        document.documentElement.classList.add('has-form-anim');

        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    signupSection.classList.add('is-shown');
                    io.disconnect();   // играем один раз
                }
            });
        }, { threshold: 0.25 });

        io.observe(signupSection);
    }
});