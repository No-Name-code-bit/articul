// js/demos.js — декоративные анимации в секции «Как это работает».
// Каждое демо привязано к своему шагу: цикл крутится, только пока шаг
// активен (по скролл-спаю) и блок виден на экране. При деактивации
// демо сбрасывается и стартует заново при возвращении к шагу.
// При prefers-reduced-motion ничего не анимируется — статичный кадр из HTML.
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !document.querySelector('.step-demo')) {
        return;
    }

    // Скрытые стартовые состояния в CSS действуют только когда JS точно работает
    document.documentElement.classList.add('has-demos');

    var TYPING_PHRASES = ['04465-33471', 'Колодки передние Camry 2015'];
    var FLY_MS = 900;   // длительность полёта чипа, синхронно с CSS

    /* Номер активного шага ведёт скролл-спай (startScrollSpy ниже) */
    var activeIndex = -1;

    /* Видимость блока на экране — чтобы не работать за пределами вьюпорта */
    var observer = 'IntersectionObserver' in window
        ? new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                entry.target._visible = entry.isIntersecting;
            });
        }, { threshold: 0.15 })
        : null;

    function watch(box) {
        box._visible = true;
        if (observer) observer.observe(box);
    }

    /*
     * Каркас демо. Пока шаг активен и блок на экране — крутим циклы.
     * Деактивация увеличивает «поколение» (gen): все отложенные колбэки
     * старого поколения при срабатывании видят устаревший номер и прекращаются,
     * после чего состояние демо сбрасывается до исходного.
     */
    function createDemo(box, stepIndex, resetState, runCycle) {
        var gen = 0;

        function isCurrent(g) {
            return g === gen;
        }

        // пропускает дальше только когда демо актуально, видно и его шаг активен
        function gate(g, next) {
            if (isCurrent(g) && box._visible !== false && activeIndex === stepIndex) {
                next();
            } else {
                setTimeout(function () { gate(g, next); }, 350);
            }
        }

        watch(box);

        return {
            index: stepIndex,
            activate: function () {
                gen += 1;
                box.classList.add('is-running');
                resetState();
                runCycle(gen, gate, isCurrent);
            },
            deactivate: function () {
                gen += 1;
                box.classList.remove('is-running');
                resetState();
            }
        };
    }

    /* Шаг 1 — ввод запроса: сначала артикул, потом название детали */
    function makeTyping(box) {
        var el = box.querySelector('.demo-type-text');

        function resetState() {
            el.textContent = '';
        }

        function runCycle(g, gate, isCurrent) {
            var phraseIndex = 0;
            var charIndex = 0;
            var deleting = false;

            function tick() {
                var phrase = TYPING_PHRASES[phraseIndex];

                if (!deleting) {
                    charIndex += 1;
                    el.textContent = phrase.slice(0, charIndex);
                    if (charIndex === phrase.length) {
                        deleting = true;
                        setTimeout(engage, 2200);   // пауза на полной фразе
                        return;
                    }
                    setTimeout(engage, 55 + Math.random() * 65);
                } else {
                    charIndex -= 1;
                    el.textContent = phrase.slice(0, charIndex);
                    if (charIndex === 0) {
                        deleting = false;
                        phraseIndex = (phraseIndex + 1) % TYPING_PHRASES.length;
                        setTimeout(engage, 450);
                        return;
                    }
                    setTimeout(engage, 24);
                }
            }

            function engage() {
                if (!isCurrent(g)) return;
                gate(g, tick);
            }

            engage();
        }

        return createDemo(box, 0, resetState, runCycle);
    }

    /* Шаг 2 — площадки «думают» вразноброс (у каждой своё случайное время),
       затем по одной улетают в наше лого; каждое попадание делает его
       крупнее и ярче — «получение сил» */
    function makeAggregate(box) {
        var chips = Array.prototype.slice.call(box.querySelectorAll('.agg-chip'));
        var core = box.querySelector('.agg-core');

        function flyToCore(chip) {
            var cr = core.getBoundingClientRect();
            var cx = cr.left + cr.width / 2;
            var cy = cr.top + cr.height / 2;
            var r = chip.getBoundingClientRect();
            chip.style.setProperty('--dx', Math.round(cx - r.left - r.width / 2) + 'px');
            chip.style.setProperty('--dy', Math.round(cy - r.top - r.height / 2) + 'px');
            chip.classList.add('is-flying');
        }

        function resetState() {
            chips.forEach(function (chip) {
                chip.classList.remove('is-loaded', 'is-flying', 'is-gone');
                chip.style.removeProperty('--dx');
                chip.style.removeProperty('--dy');
            });
            core.style.setProperty('--s', '1');
        }

        function runCycle(g, gate, isCurrent) {
            var landed = 0;

            chips.forEach(function (chip) {
                // каждая площадка отвечает своё время — никакого порядка по очереди
                var thinkMs = 500 + Math.random() * 2200;

                setTimeout(function () {
                    if (!isCurrent(g)) return;
                    chip.classList.add('is-loaded');   // спиннер гаснет, имя появляется

                    // короткая пауза «показали имя» — и полёт к лого
                    setTimeout(function () {
                        if (!isCurrent(g)) return;
                        gate(g, function () {
                            flyToCore(chip);

                            setTimeout(function () {
                                if (!isCurrent(g)) return;
                                chip.classList.add('is-gone');
                                landed += 1;
                                core.style.setProperty('--s', String(1 + landed * 0.09));
                                core.classList.remove('is-power');
                                void core.offsetWidth;
                                core.classList.add('is-power');   // перелив + вспышка силы

                                if (landed === chips.length) {
                                    setTimeout(function () {
                                        if (!isCurrent(g)) return;
                                        gate(g, function () {
                                            resetState();
                                            runCycle(g, gate, isCurrent);
                                        });
                                    }, 2300);
                                }
                            }, FLY_MS);
                        });
                    }, 650);
                }, thinkMs);
            });
        }

        return createDemo(box, 1, resetState, runCycle);
    }

    /* Шаг 3 — результаты появляются сверху вниз и «дышат», затем список обновляется */
    function makeResults(box) {
        var rows = box.querySelectorAll('.res-row');

        Array.prototype.forEach.call(rows, function (row, i) {
            row.style.setProperty('--i', i);
        });

        function resetState() {
            box.classList.remove('is-shown');
        }

        function runCycle(g, gate, isCurrent) {
            void box.offsetWidth;
            box.classList.add('is-shown');

            setTimeout(function () {
                if (!isCurrent(g)) return;
                gate(g, function () {
                    resetState();
                    runCycle(g, gate, isCurrent);
                });
            }, 5200);
        }

        return createDemo(box, 2, resetState, runCycle);
    }

    /* Скролл по секции: активный шаг увеличивается, счётчик у липкого
       заголовка показывает его номер, его демо получает ход */
    function startScrollSpy(demos) {
        var steps = Array.prototype.slice.call(document.querySelectorAll('.steps .step'));
        var counterEl = document.querySelector('.how-current');

        if (!steps.length || !('IntersectionObserver' in window)) {
            return;
        }

        var ratios = [];

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                ratios[steps.indexOf(entry.target)] = entry.isIntersecting ? entry.intersectionRatio : 0;
            });

            var bestIndex = -1;
            var bestRatio = 0;
            ratios.forEach(function (ratio, i) {
                if (ratio > bestRatio) {
                    bestRatio = ratio;
                    bestIndex = i;
                }
            });

            if (bestIndex !== -1) {
                setActive(steps[bestIndex]);
            }
        }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1], rootMargin: '-25% 0px -25% 0px' });

        steps.forEach(function (step) { io.observe(step); });

        function setActive(active) {
            var idx = steps.indexOf(active);

            steps.forEach(function (step) {
                step.classList.toggle('is-active', step === active);
            });

            if (counterEl) {
                counterEl.textContent = String(idx + 1);
            }

            if (idx !== activeIndex) {
                activeIndex = idx;
                demos.forEach(function (demo) {
                    if (demo.index === idx) {
                        demo.activate();
                    } else {
                        demo.deactivate();
                    }
                });
            }
        }

        setActive(steps[0]);
    }

    function init() {
        var typingBox = document.querySelector('.demo-typing');
        var aggBox = document.querySelector('.demo-aggregate');
        var resBox = document.querySelector('.demo-results');

        var demos = [];
        if (typingBox) demos.push(makeTyping(typingBox));
        if (aggBox) demos.push(makeAggregate(aggBox));
        if (resBox) demos.push(makeResults(resBox));

        startScrollSpy(demos);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
