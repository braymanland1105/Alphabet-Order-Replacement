document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed'); // Trace 1

    // ### Elements
    const gameContainer = document.getElementById('game-container');
    const titleScreen = document.getElementById('title-screen');
    const gameScreen = document.getElementById('game-screen');
    const endScreen = document.getElementById('end-screen');
    const introPopup = document.getElementById('intro-popup');
    const startButton = document.getElementById('start-button');
    const popupGoButton = document.getElementById('popup-go-button');
    const playAgainButton = document.getElementById('play-again-button');
    const alphabetSlotsContainer = document.getElementById('alphabet-slots');
    const blockPile = document.getElementById('block-pile');
    const finalAbcContainer = document.getElementById('final-abc');
    const animationArea = document.getElementById('animation-area');
    const monkeyJumpingSprite = document.getElementById('monkey-jumping-sprite');
    const introVO = document.getElementById('intro-vo');
    const endVO = document.getElementById('end-vo');

    // **Initial Validation**
    if (!gameContainer || !gameScreen || !alphabetSlotsContainer || !blockPile || !animationArea || !finalAbcContainer || !monkeyJumpingSprite || !introVO || !endVO) {
        console.error("CRITICAL ERROR: Could not find one or more essential elements on load. Check HTML IDs:", {
            gameContainer, gameScreen, alphabetSlotsContainer, blockPile, animationArea, finalAbcContainer, monkeyJumpingSprite, introVO, endVO
        });
        return;
    }
    console.log('All essential elements found'); // Trace 2

    // ### Game State
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
    let placedLetters = {};
    let draggedBlock = null;
    let originalRotation = '';
    let currentSong = null;
    let letterBlocks = [];
    let blockData = {};
    let monkeySound = null;
    let monkeySoundLooping = false;
    let monkeyAnimationInterval = null;
    let monkeyFallInterval = null;

    // ### Audio Playback Functions
    const stopAudio = (audioElement) => {
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
    };

    const playSound = (soundName) => {
        let soundFile = '';
        let isLetterSound = false;
        switch (soundName) {
            case 'click': soundFile = 'assets/audio/Click Sound.mp3'; break;
            case 'incorrect': soundFile = 'assets/audio/Incorrect Sound.mp3'; break;
            case 'correct': soundFile = 'assets/audio/Correct Sound.mp3'; break;
            case 'abc_song': if (currentSong) { currentSong.pause(); currentSong.currentTime = 0; } soundFile = 'assets/audio/ABC Song.mp3'; break;
            case 'applause': soundFile = 'assets/audio/Applause.mp3'; break;
            case 'monkey': soundFile = 'assets/audio/Monkey Sound.mp3'; break;
            default: if (alphabet.includes(soundName)) { soundFile = `assets/audio/${soundName}.wav`; isLetterSound = true; } else { console.warn(`Unknown sound name: ${soundName}`); return; }
        }
        if (soundFile) {
            try {
                const audio = new Audio(soundFile);
                if (soundName === 'abc_song') { currentSong = audio; }
                if (soundName === 'monkey') { audio.volume = 0.7; }
                audio.play().catch(e => console.error(`Error playing sound "${soundName}":`, e));
            } catch (e) {
                console.error(`Error creating Audio object for "${soundName}":`, e);
            }
        }
    };

    function startMonkeySound() {
        if (monkeySound) {
            monkeySound.pause();
            monkeySound.currentTime = 0;
        }
        try {
            monkeySound = new Audio('assets/audio/Monkey Sound.mp3');
            monkeySound.volume = 0.7;
            monkeySound.addEventListener('ended', function() {
                this.currentTime = 0;
                if (monkeySoundLooping) {
                    this.play().catch(e => console.error("Error looping monkey sound:", e));
                }
            });
            monkeySoundLooping = true;
            monkeySound.play().catch(e => console.error("Error playing monkey sound:", e));
        } catch (e) {
            console.error("Error creating monkey sound object:", e);
        }
    }

    function stopMonkeySound() {
        monkeySoundLooping = false;
        if (monkeySound) {
            monkeySound.pause();
            monkeySound.currentTime = 0;
        }
    }

    // ### Utility Function: Shuffle Array
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ### Core Functions
    function initializeGame() {
        console.log('Initializing game'); // Trace 3
        stopAudio(currentSong);
        currentSong = null;
        stopAudio(introVO);
        stopAudio(endVO);

        if (monkeyAnimationInterval) {
            clearInterval(monkeyAnimationInterval);
            monkeyAnimationInterval = null;
        }
        if (monkeyFallInterval) {
            clearInterval(monkeyFallInterval);
            monkeyFallInterval = null;
        }

        if (alphabetSlotsContainer) alphabetSlotsContainer.innerHTML = '';
        if (blockPile) blockPile.innerHTML = '';
        if (animationArea) animationArea.innerHTML = '';
        if (finalAbcContainer) finalAbcContainer.innerHTML = '';

        if (animationArea && !animationArea.contains(monkeyJumpingSprite)) {
            animationArea.appendChild(monkeyJumpingSprite);
        }

        placedLetters = {};
        draggedBlock = null;
        letterBlocks = [];
        blockData = {};
        document.querySelectorAll('.screen').forEach(s => { if (s) s.classList.remove('active'); });
        document.querySelectorAll('.popup').forEach(p => { if (p) p.classList.remove('active'); });
        if (titleScreen) titleScreen.classList.add('active');

        monkeyJumpingSprite.classList.add('monkey-hidden');
        monkeyJumpingSprite.style.backgroundPosition = '0 0';
        monkeyJumpingSprite.style.top = '';
        monkeyJumpingSprite.style.left = '';

        stopMonkeySound();
        console.log('Game initialized'); // Trace 4
    }

    function startIntroAnimation() {
        console.log('Starting intro animation'); // Trace 5
        if (!titleScreen || !gameScreen || !introPopup || !endScreen || !alphabetSlotsContainer || !blockPile || !animationArea || !monkeyJumpingSprite) {
            console.error("startIntroAnimation: Elements missing.");
            return;
        }
        titleScreen.classList.remove('active');
        gameScreen.classList.add('active');
        introPopup.classList.remove('active');
        endScreen.classList.remove('active');

        if (animationArea && !animationArea.contains(monkeyJumpingSprite)) {
            animationArea.appendChild(monkeyJumpingSprite);
        }

        monkeyJumpingSprite.classList.add('monkey-hidden');

        alphabetSlotsContainer.innerHTML = '';
        blockPile.innerHTML = '';

        letterBlocks = [];
        blockData = {};

        const slotElements = {};
        alphabet.forEach(letter => {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.letter = letter;
            alphabetSlotsContainer.appendChild(slot);
            slotElements[letter] = slot;
        });

        alphabetSlotsContainer.offsetHeight;

        const animationAreaRect = animationArea.getBoundingClientRect();
        const slotElementsData = {};

        alphabet.forEach(letter => {
            const slot = slotElements[letter];
            const rect = slot.getBoundingClientRect();
            slotElementsData[letter] = {
                top: rect.top - animationAreaRect.top,
                left: rect.left - animationAreaRect.left,
                width: slot.offsetWidth,
                height: slot.offsetHeight
            };
        });

        alphabet.forEach(letter => {
            const block = document.createElement('div');
            block.classList.add('letter-block', 'initial-position');
            if (Math.random() < 0.5) {
                block.classList.add('color-alt');
            }
            block.textContent = letter;
            block.dataset.letter = letter;
            block.style.position = 'absolute';
            block.style.top = `${slotElementsData[letter].top}px`;
            block.style.left = `${slotElementsData[letter].left}px`;
            block.style.transform = 'rotate(0deg)';
            animationArea.appendChild(block);
            letterBlocks.push(block);
            blockData[letter] = block;
        });

        setTimeout(() => {
            console.log('Proceeding with sequential animation'); // Trace 6
            proceedWithSequentialAnimation(slotElementsData);
        }, 100);
    }

    function proceedWithSequentialAnimation(slotElementsData) {
        console.log('Executing sequential animation steps'); // Trace 7
        startMonkeySound();
        let animationAreaRect = animationArea.getBoundingClientRect();
        const pileRect = blockPile.getBoundingClientRect();
        const pileTopRelative = pileRect.top - animationAreaRect.top;
        const pileHeight = blockPile.offsetHeight - 60;
        const pileWidth = blockPile.offsetWidth - 60;
        const groundY = pileRect.top - animationAreaRect.top - 80;
        const blockFallTime = 1000;
        const delayBetweenBlocks = 60;

        const frameWidth = 122;
        const frameHeight = 122;
        const spriteFrames = 2;

        const leftToLetters = {};
        alphabet.forEach(letter => {
            const left = slotElementsData[letter].left;
            if (!leftToLetters[left]) leftToLetters[left] = [];
            leftToLetters[left].push(letter);
        });

        const uniqueLefts = Object.keys(leftToLetters).map(Number).sort((a, b) => a - b);
        const numLefts = uniqueLefts.length;
        const groupSize = Math.ceil(numLefts / 3);
        const leftGroupLefts = uniqueLefts.slice(0, groupSize);
        const middleGroupLefts = uniqueLefts.slice(groupSize, 2 * groupSize);
        const rightGroupLefts = uniqueLefts.slice(2 * groupSize);

        const leftLetters = [];
        const middleLetters = [];
        const rightLetters = [];
        alphabet.forEach(letter => {
            const left = slotElementsData[letter].left;
            if (leftGroupLefts.includes(left)) {
                leftLetters.push(letter);
            } else if (middleGroupLefts.includes(left)) {
                middleLetters.push(letter);
            } else if (rightGroupLefts.includes(left)) {
                rightLetters.push(letter);
            }
        });

        function calculateGroupCenter(letters) {
            if (letters.length === 0) return { top: 0, left: 0 };
            let sumTop = 0, sumLeft = 0;
            letters.forEach(letter => {
                const data = slotElementsData[letter];
                sumTop += data.top + data.height / 2;
                sumLeft += data.left + data.width / 2;
            });
            return {
                top: sumTop / letters.length,
                left: sumLeft / letters.length
            };
        }

        const rightCenter = calculateGroupCenter(rightLetters);
        const middleCenter = calculateGroupCenter(middleLetters);
        const leftCenter = calculateGroupCenter(leftLetters);

        const animationAreaWidth = animationAreaRect.width;
        const landAfterFirst = animationAreaWidth * 2 / 3;
        const landAfterSecond = animationAreaWidth / 3;
        const landAfterThird = 150;

        const initialMonkeyPosX = animationAreaWidth - 150;
        const initialMonkeyPosY = groundY;

        monkeyJumpingSprite.style.top = `${initialMonkeyPosY}px`;
        monkeyJumpingSprite.style.left = `${initialMonkeyPosX}px`;
        monkeyJumpingSprite.classList.remove('monkey-hidden');
        console.log('Monkey sprite made visible and positioned at start:', monkeyJumpingSprite.style.top, monkeyJumpingSprite.style.left);
        console.log('Monkey sprite classes after initial visibility set:', monkeyJumpingSprite.classList);

        const animateSectionFall = (letters) => {
            console.log('Animating section fall'); // Trace 8
            return new Promise(resolve => {
                let blockDelay = 0;
                let maxBlockTimeout = 0;

                letters.forEach(letter => {
                    const block = blockData[letter];
                    if (!block) return;

                    setTimeout(() => {
                        const randomX = Math.random() * pileWidth + 30;
                        const randomY = pileTopRelative + (Math.random() * pileHeight);
                        const randomRot = Math.random() * 90 - 45;

                        block.style.top = `${randomY}px`;
                        block.style.left = `${randomX}px`;
                        block.style.transform = `rotate(${randomRot}deg)`;

                        setTimeout(() => {
                            if (animationArea.contains(block)) animationArea.removeChild(block);
                            if (blockPile) {
                                block.classList.remove('initial-position');
                                block.style.position = '';
                                block.style.top = '';
                                block.style.left = '';
                                block.style.transform = `rotate(${randomRot}deg)`;
                                blockPile.appendChild(block);
                            }
                        }, blockFallTime);
                    }, blockDelay);

                    maxBlockTimeout = blockDelay + blockFallTime;
                    blockDelay += delayBetweenBlocks;
                });

                setTimeout(resolve, maxBlockTimeout + 100);
            });
        };

        const animateMonkeyJumpSequence = (targetTop, targetLeft, landingLeft) => {
            console.log('Animating monkey jump sequence');
            const currentTop = parseFloat(monkeyJumpingSprite.style.top) || groundY;
            const currentLeft = parseFloat(monkeyJumpingSprite.style.left) || initialMonkeyPosX;
            const jumpPeakY = targetTop - 20; // Peak just above target
            const totalDuration = 0.8; // Total animation time in seconds

            return new Promise(resolve => {
                monkeyJumpingSprite.style.transition = 'none';
                monkeyJumpingSprite.classList.remove('monkey-hidden');

                let animationStartTime = null;

                const jumpAnimation = (timestamp) => {
                    if (!animationStartTime) animationStartTime = timestamp;
                    const elapsed = (timestamp - animationStartTime) / 1000; // Time in seconds
                    const progress = Math.min(elapsed / totalDuration, 1);

                    const horizontalPos = currentLeft + (landingLeft - currentLeft) * progress;

                    let verticalPos;
                    if (progress < 0.5) {
                        const ascentProgress = progress / 0.5;
                        verticalPos = currentTop - (currentTop - jumpPeakY) * (1 - Math.pow(1 - ascentProgress, 2));
                    } else {
                        const descentProgress = (progress - 0.5) / 0.5;
                        verticalPos = jumpPeakY + (groundY - jumpPeakY) * Math.pow(descentProgress, 2);
                    }

                    monkeyJumpingSprite.style.top = `${verticalPos}px`;
                    monkeyJumpingSprite.style.left = `${horizontalPos}px`;

                    if (progress < 0.85) {
                        monkeyJumpingSprite.style.backgroundPosition = `-${frameWidth}px 0`; // Jumping frame
                    } else {
                        monkeyJumpingSprite.style.backgroundPosition = '0 0'; // Standing frame
                    }

                    if (progress < 1) {
                        requestAnimationFrame(jumpAnimation);
                    } else {
                        monkeyJumpingSprite.style.top = `${groundY}px`;
                        monkeyJumpingSprite.style.left = `${landingLeft}px`;
                        monkeyJumpingSprite.style.backgroundPosition = '0 0';
                        resolve();
                    }
                };
                requestAnimationFrame(jumpAnimation);
            });
        };

        const exitMonkeyLeft = () => {
            console.log('Animating monkey exit left');
            return new Promise(resolve => {
                if (monkeyAnimationInterval) clearInterval(monkeyAnimationInterval);
                if (monkeyFallInterval) clearInterval(monkeyFallInterval);

                monkeyJumpingSprite.style.transition = 'none';
                monkeyJumpingSprite.classList.remove('monkey-hidden');

                const startLeft = parseFloat(monkeyJumpingSprite.style.left);
                const startTop = parseFloat(monkeyJumpingSprite.style.top);
                const endLeft = -122; // Final position off-screen
                const endTop = startTop - 50; // Jump up slightly while exiting
                const duration = 0.8; // seconds

                let startTime = null;
                let frame = 0;
                const frameInterval = 150; // ms between frame changes
                let lastFrameTime = 0;

                const exitAnimation = (timestamp) => {
                    if (!startTime) startTime = timestamp;
                    const elapsed = (timestamp - startTime) / 1000; // seconds
                    const progress = Math.min(elapsed / duration, 1);

                    const currentLeft = startLeft + (endLeft - startLeft) * progress;
                    const currentTop = startTop + (endTop - startTop) * Math.sin(progress * Math.PI); // Arc movement

                    monkeyJumpingSprite.style.left = `${currentLeft}px`;
                    monkeyJumpingSprite.style.top = `${currentTop}px`;

                    if (timestamp - lastFrameTime > frameInterval) {
                        frame = (frame === 0) ? 1 : 0;
                        monkeyJumpingSprite.style.backgroundPosition = `-${frame * frameWidth}px 0`;
                        lastFrameTime = timestamp;
                    }

                    if (progress < 1) {
                        requestAnimationFrame(exitAnimation);
                    } else {
                        monkeyJumpingSprite.classList.add('monkey-hidden');
                        monkeyJumpingSprite.style.backgroundPosition = '0 0';
                        stopMonkeySound();
                        resolve();
                    }
                };
                requestAnimationFrame(exitAnimation);
            });
        };

        const shuffledRightLetters = shuffleArray(rightLetters);
        const shuffledMiddleLetters = shuffleArray(middleLetters);
        const shuffledLeftLetters = shuffleArray(leftLetters);

        console.log('Starting animation sequence promise chain'); // Trace 18
        new Promise(resolve => setTimeout(resolve, 200))
            .then(() => animateMonkeyJumpSequence(rightCenter.top - 60, rightCenter.left - 30, landAfterFirst))
            .then(() => animateSectionFall(shuffledRightLetters))
            .then(() => new Promise(resolve => setTimeout(resolve, 150)))
            .then(() => animateMonkeyJumpSequence(middleCenter.top - 60, middleCenter.left, landAfterSecond))
            .then(() => animateSectionFall(shuffledMiddleLetters))
            .then(() => new Promise(resolve => setTimeout(resolve, 150)))
            .then(() => animateMonkeyJumpSequence(leftCenter.top - 60, leftCenter.left - 30, landAfterThird))
            .then(() => animateSectionFall(shuffledLeftLetters))
            .then(() => new Promise(resolve => setTimeout(resolve, 150)))
            .then(() => exitMonkeyLeft())
            .then(() => {
                console.log('Animation sequence complete, showing intro popup'); // Trace 19
                setTimeout(showIntroPopupActual, 500);
            })
            .catch(error => {
                console.error("Error during intro animation:", error);
                stopMonkeySound();
                if (monkeyAnimationInterval) clearInterval(monkeyAnimationInterval);
                if (monkeyFallInterval) clearInterval(monkeyFallInterval);
                monkeyAnimationInterval = null;
                monkeyFallInterval = null;
                if (monkeyJumpingSprite) {
                    monkeyJumpingSprite.classList.add('monkey-hidden');
                    monkeyJumpingSprite.style.backgroundPosition = '0 0';
                    monkeyJumpingSprite.style.top = '';
                    monkeyJumpingSprite.style.left = '';
                }
                showIntroPopupActual();
            });
    }

    function showIntroPopupActual() {
        console.log('Showing intro popup'); // Trace 20
        if (!introPopup || !alphabetSlotsContainer) {
            console.error("showIntroPopupActual: Elements missing.");
            return;
        }
        if (monkeyAnimationInterval) clearInterval(monkeyAnimationInterval);
        if (monkeyFallInterval) clearInterval(monkeyFallInterval);
        monkeyAnimationInterval = null;
        monkeyFallInterval = null;
        if (monkeyJumpingSprite) {
            monkeyJumpingSprite.classList.add('monkey-hidden');
            monkeyJumpingSprite.style.backgroundPosition = '0 0';
            monkeyJumpingSprite.style.top = '';
            monkeyJumpingSprite.style.left = '';
        }

        const popupMonkey = introPopup.querySelector('.popup-monkey');
        if (popupMonkey) popupMonkey.src = 'assets/images/Oh_No_Monkey.png';

        introPopup.classList.add('active');
        stopAudio(introVO);
        introVO.play().catch(e => console.error("Error playing intro VO:", e));

        letterBlocks.forEach(block => {
            if (block) {
                block.draggable = true;
                block.removeEventListener('dragstart', dragStart);
                block.removeEventListener('drag', drag);
                block.removeEventListener('dragend', dragEnd);

                block.addEventListener('dragstart', dragStart);
                block.addEventListener('drag', drag);
                block.addEventListener('dragend', dragEnd);
            }
        });

        const slots = alphabetSlotsContainer.querySelectorAll('.slot');
        if (slots.length > 0) {
            slots.forEach(slot => {
                slot.removeEventListener('dragover', dragOver);
                slot.removeEventListener('dragenter', dragEnter);
                slot.removeEventListener('dragleave', dragLeave);
                slot.removeEventListener('drop', drop);

                slot.addEventListener('dragover', dragOver);
                slot.addEventListener('dragenter', dragEnter);
                slot.addEventListener('dragleave', dragLeave);
                slot.addEventListener('drop', drop);
            });
        } else {
            console.error("showIntroPopupActual: No slots found.");
        }
    }

    function startGame() {
        console.log('Starting game'); // Trace 21
        stopAudio(introVO);
        if (introPopup) {
            introPopup.classList.remove('active');
        } else {
            console.error("startGame: introPopup not found.");
        }
    }

    function checkCompletion() {
        return Object.keys(placedLetters).length === alphabet.length;
    }

    function endGameSequence() {
        console.log('Starting end game sequence'); // Trace 22
        if (!gameScreen || !endScreen || !finalAbcContainer) {
            console.error("endGameSequence: Missing required elements.");
            return;
        }
        stopAudio(endVO);
        if (monkeyAnimationInterval) clearInterval(monkeyAnimationInterval);
        if (monkeyFallInterval) clearInterval(monkeyFallInterval);
        monkeyAnimationInterval = null;
        monkeyFallInterval = null;

        if (monkeyJumpingSprite) {
            monkeyJumpingSprite.classList.add('monkey-hidden');
            monkeyJumpingSprite.style.backgroundPosition = '0 0';
            monkeyJumpingSprite.style.top = '';
            monkeyJumpingSprite.style.left = '';
        }

        // Make placed letter blocks dance during ABC song
        Object.values(placedLetters).forEach(block => { if (block) block.classList.add('dancing'); });
        playSound('abc_song');
        setTimeout(() => {
            // Stop dancing after song ends
            Object.values(placedLetters).forEach(block => { if (block) block.classList.remove('dancing'); });
            playSound('applause');

            gameScreen.classList.remove('active');
            endScreen.classList.add('active');
            finalAbcContainer.innerHTML = '';

            alphabet.forEach(letter => {
                const d = document.createElement('div');
                d.classList.add('final-letter');
                d.textContent = letter;
                finalAbcContainer.appendChild(d);
            });

            endVO.play().catch(e => console.error("Error playing end VO:", e));

            console.log('End game sequence complete'); // Trace 23
        }, 27000); // Duration of ABC song
    }

    // ### Drag-and-Drop Event Handlers
    function dragStart(event) {
        if (!event.target || event.target.classList.contains('placed')) {
            event.preventDefault();
            return;
        }
        draggedBlock = event.target;
        const letter = draggedBlock.dataset.letter;
        const currentTransform = draggedBlock.style.transform;
        const rotationMatch = currentTransform.match(/rotate\([^)]+\)/);
        originalRotation = rotationMatch ? rotationMatch[0] : '';
        playSound(letter);
        setTimeout(() => { if (draggedBlock) draggedBlock.classList.add('dragging'); }, 0);
        event.dataTransfer.effectAllowed = 'move';
        if (draggedBlock) {
            // Create a 1x1 transparent canvas to suppress default drag image
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            event.dataTransfer.setDragImage(canvas, 0, 0);
            // Set initial position for dragging visual
            draggedBlock.style.left = event.clientX - draggedBlock.offsetWidth / 2 + 'px';
            draggedBlock.style.top = event.clientY - draggedBlock.offsetHeight / 2 + 'px';
        }
    }

    function drag(event) {
        if (draggedBlock && event.clientX !== 0 && event.clientY !== 0) {
            draggedBlock.style.left = event.clientX - draggedBlock.offsetWidth / 2 + 'px';
            draggedBlock.style.top = event.clientY - draggedBlock.offsetHeight / 2 + 'px';
        }
    }

    function dragEnd(event) {
        const block = event.target;
        if (block) {
            block.classList.remove('dragging');
            if (draggedBlock && block.draggable && !block.classList.contains('placed')) {
                block.style.position = '';
                block.style.top = '';
                block.style.left = '';
                block.style.transform = originalRotation || 'none';
            }
        }
        document.querySelectorAll('.slot.over').forEach(s => { if (s) s.classList.remove('over'); });
        draggedBlock = null;
        originalRotation = '';
    }

    function dragOver(event) {
        event.preventDefault();
    }

    function dragEnter(event) {
        event.preventDefault();
        const targetSlot = event.target;
        if (targetSlot && targetSlot.classList.contains('slot') && !targetSlot.hasChildNodes()) {
            targetSlot.classList.add('over');
        }
    }

    function dragLeave(event) {
        const targetSlot = event.target;
        if (targetSlot && targetSlot.classList.contains('slot')) {
            targetSlot.classList.remove('over');
        }
    }

    function drop(event) {
        event.preventDefault();
        const slot = event.target;
        if (!slot || !slot.classList.contains('slot')) {
            if (draggedBlock) draggedBlock.classList.remove('dragging');
            return;
        }

        if (slot.classList.contains('slot') && !slot.hasChildNodes() && draggedBlock) {
            slot.classList.remove('over');
            const targetLetter = slot.dataset.letter;
            const droppedLetter = draggedBlock.dataset.letter;

            if (targetLetter === droppedLetter) {
                playSound('correct');
                if (draggedBlock.parentNode) {
                    draggedBlock.parentNode.removeChild(draggedBlock);
                }
                slot.appendChild(draggedBlock);
                draggedBlock.classList.remove('dragging');
                draggedBlock.classList.add('placed');
                draggedBlock.style.transform = 'none';
                draggedBlock.style.position = 'relative';
                draggedBlock.style.top = '';
                draggedBlock.style.left = '';
                draggedBlock.draggable = false;
                placedLetters[targetLetter] = draggedBlock;
                const tempBlockRef = draggedBlock;
                draggedBlock = null;
                if (checkCompletion()) {
                    endGameSequence();
                }
            } else {
                playSound('incorrect');
                if (draggedBlock) {
                    draggedBlock.classList.add('wiggle');
                    draggedBlock.classList.remove('dragging');
                    setTimeout(() => {
                        if (draggedBlock && draggedBlock.classList.contains('wiggle')) {
                            draggedBlock.classList.remove('wiggle');
                            draggedBlock.style.transform = originalRotation || 'none';
                        }
                        if (draggedBlock && !draggedBlock.classList.contains('placed')) {
                            draggedBlock.draggable = true;
                        }
                    }, 500);
                }
            }
        } else {
            if (slot.classList.contains('slot')) slot.classList.remove('over');
            if (draggedBlock) {
                draggedBlock.classList.remove('dragging');
            }
        }
    }

    // ### Event Listeners
    if (startButton) {
        startButton.addEventListener('click', () => {
            console.log('Start button clicked'); // Trace 24
            playSound('click');
            startIntroAnimation();
        });
    } else {
        console.error("Start Button not found!");
    }

    if (popupGoButton) {
        popupGoButton.addEventListener('click', () => {
            console.log('Popup GO button clicked'); // Trace 25
            playSound('click');
            startGame();
        });
    } else {
        console.error("Popup Go Button not found!");
    }

    if (playAgainButton) {
        playAgainButton.addEventListener('click', () => {
            console.log('Play Again button clicked'); // Trace 26
            playSound('click');
            initializeGame();
        });
    } else {
        console.error("Play Again Button not found!");
    }

    // ### Start the Game
    console.log('Calling initializeGame on load'); // Trace 27
    initializeGame();
});
