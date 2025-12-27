document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('scoreBoard');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreElement = document.getElementById('finalScore');
    
    // Yeni elementler
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingText = document.getElementById('loadingText');
    const loaderSpinner = document.getElementById('loaderSpinner');
    const startButton = document.getElementById('startButton');

    if (!gameOverScreen || !scoreElement || !loadingScreen) {
        console.error("HATA: HTML elementleri bulunamadı!");
        return;
    }

    // --- SES YÖNETİMİ (GARANTİLİ YÖNTEM) ---
    const bgMusic = new Audio();
    bgMusic.src = 'assets/muzik.mp3';
    bgMusic.loop = true; 
    bgMusic.volume = 0.5; 
    
    // Müziğin yüklendiğinden emin olalım (Preload)
    bgMusic.load();

    // --- RESİM YÖNETİMİ ---
    const images = {};
    const imageSources = {
        bg: 'assets/arkaplan.png',
        player: 'assets/karakter.png', 
        pie: 'assets/turta.png',
        ground: 'assets/zemin.png'
    };

    const eatFrameCount = 2; 
    const eatImages = []; 

    let loadedCount = 0;
    // Resimler + Müzik (Müziği de yükleme sayacına dahil etmeyelim, 
    // çünkü bazen mobilde müzik yükleme olayı tetiklenmeyebilir, 
    // sadece resimleri baz alıp müziği butona basınca başlatmak daha güvenli).
    const totalImages = Object.keys(imageSources).length + eatFrameCount;

    function checkAllAssetsLoaded() {
        loadedCount++;
        if (loadedCount === totalImages) {
            // HER ŞEY YÜKLENDİ!
            // Şimdi "Yükleniyor" yazısını kaldırıp "Başla" butonunu gösterelim.
            loaderSpinner.style.display = 'none';
            loadingText.style.display = 'none';
            startButton.style.display = 'block'; // Butonu göster
        }
    }

    // "OYUNA BAŞLA" Butonuna Basınca Çalışacak Fonksiyon
    startButton.addEventListener('click', () => {
        // 1. Müziği Başlat (Kullanıcı etkileşimi olduğu için %100 çalışır)
        bgMusic.play().then(() => {
            console.log("Müzik çalıyor.");
        }).catch((err) => {
            console.warn("Müzik hatası:", err);
        });

        // 2. Yükleme ekranını gizle
        loadingScreen.style.display = 'none';

        // 3. Oyunu Başlat
        gameRunning = true;
        requestAnimationFrame(update);
    });


    // --- Resim Yüklemeleri ---
    for (let key in imageSources) {
        images[key] = new Image();
        images[key].onload = checkAllAssetsLoaded;
        images[key].onerror = checkAllAssetsLoaded;
        images[key].src = imageSources[key];
    }

    for (let i = 0; i < eatFrameCount; i++) {
        const img = new Image();
        img.onload = checkAllAssetsLoaded;
        img.onerror = checkAllAssetsLoaded;
        img.src = `assets/karakter_yeme_${i}.png`; 
        eatImages.push(img);
    }

    // --- ÇÖZÜNÜRLÜK AYARLARI ---
    canvas.width = 1080;
    canvas.height = 1920;

    // --- OYUN DEĞİŞKENLERİ ---
    // Başlangıçta false yapıyoruz, butona basınca true olacak
    let gameRunning = false; 
    let score = 0;
    let lastTime = 0;
    let spawnTimer = 0;

    // --- HIZ AYARLARI ---
    let dropSpeedPPS = 400; 
    let spawnInterval = 1500; 

    // OYUNCU AYARLARI
    const player = {
        width: 280,   
        height: 380,  
        x: (1080 / 2) - 140, 
        y: canvas.height - 380, 
        speedPPS: 1200,
        facingRight: true,
        isEating: false,      
        frameX: 0,            
        frameTimer: 0,        
        frameInterval: 150,    
        maxFrames: eatFrameCount 
    };

    let pies = [];
    let leftPressed = false;
    let rightPressed = false;

    // --- KONTROLLER ---
    document.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowLeft') leftPressed = true;
        if(e.key === 'ArrowRight') rightPressed = true;
    });
    document.addEventListener('keyup', (e) => {
        if(e.key === 'ArrowLeft') leftPressed = false;
        if(e.key === 'ArrowRight') rightPressed = false;
    });

    document.addEventListener('touchstart', handleTouch, {passive: false});
    document.addEventListener('touchmove', handleTouch, {passive: false});
    document.addEventListener('touchend', () => {
        leftPressed = false;
        rightPressed = false;
    });

    function handleTouch(e) {
        if(e.type === 'touchmove') e.preventDefault(); 
        
        // Oyun başlamadıysa dokunmayı algılama
        if (!gameRunning) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width; 
        const touchX = (e.touches[0].clientX - rect.left) * scaleX;

        if (touchX < canvas.width / 2) {
            leftPressed = true;
            rightPressed = false;
        } else {
            rightPressed = true;
            leftPressed = false;
        }
    }

    // --- OYUN FONKSİYONLARI ---
    function spawnPie() {
        const size = 160; 
        const x = Math.random() * (canvas.width - size);
        pies.push({
            x: x,
            y: -150, 
            size: size,
            speedPPS: dropSpeedPPS + Math.random() * 200,
            angle: 0, 
            rotationSpeed: (Math.random() - 0.5) * 10 
        });
    }

    // --- UPDATE ---
    function update(timestamp) {
        if (!gameRunning) return;

        if (!lastTime) lastTime = timestamp;
        const deltaTime = (timestamp - lastTime) / 1000; 
        lastTime = timestamp;

        if (deltaTime > 0.1) {
            requestAnimationFrame(update);
            return;
        }

        // Animasyon
        if (player.isEating) {
            player.frameTimer += deltaTime * 1000;
            if (player.frameTimer > player.frameInterval) {
                player.frameX++; 
                player.frameTimer = 0; 
                if (player.frameX >= player.maxFrames) {
                    player.frameX = 0;
                    player.isEating = false; 
                }
            }
        }
        
        // Hareket
        if (leftPressed && player.x > 0) {
            player.x -= player.speedPPS * deltaTime;
            player.facingRight = false;
        }
        if (rightPressed && player.x + player.width < canvas.width) {
            player.x += player.speedPPS * deltaTime;
            player.facingRight = true;
        }
        
        player.y = canvas.height - 450; 

        spawnTimer += deltaTime * 1000; 
        if (spawnTimer > spawnInterval) {
            spawnPie();
            spawnTimer = 0; 
        }

        // Turtalar
        for (let i = 0; i < pies.length; i++) {
            let p = pies[i];
            p.y += p.speedPPS * deltaTime;
            p.angle += p.rotationSpeed * deltaTime;

            let hitBoxX = 70; 
            let hitBoxY = 80; 

            if (
                p.x < player.x + player.width - hitBoxX && 
                p.x + p.size > player.x + hitBoxX &&       
                p.y < player.y + player.height &&          
                p.y + p.size > player.y + hitBoxY          
            ) {
                score++;
                scoreElement.innerText = "Skor: " + score;
                pies.splice(i, 1);
                i--;

                player.isEating = true;
                player.frameX = 0;
                player.frameTimer = 0;

                if (score % 5 === 0) {
                    dropSpeedPPS += 50; 
                    if (spawnInterval > 400) spawnInterval -= 100; 
                }
            }
            else if (p.y > canvas.height - 350) { 
                gameOver();
            }
        }

        draw();
        requestAnimationFrame(update);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Arkaplan
        if (images.bg.complete) ctx.drawImage(images.bg, 0, 0, canvas.width, canvas.height);
        else { ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height); }

        // Zemin
        if (images.ground.complete) ctx.drawImage(images.ground, -100, canvas.height - 1050, 1400, 1900);
        else { ctx.fillStyle = "#4CAF50"; ctx.fillRect(0, canvas.height - 100, 1080, 100); }

        // Karakter
        if (images.player.complete) {
            ctx.save(); 
            ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
            if (!player.facingRight) ctx.scale(-1, 1);
            
            if (player.isEating) {
                const currentEatImage = eatImages[player.frameX];
                if (currentEatImage && currentEatImage.complete) {
                    ctx.drawImage(
                        currentEatImage, 
                        -player.width / 2, -player.height / 2, 
                        player.width, player.height 
                    );
                }
            } else {
                ctx.drawImage(images.player, -player.width / 2, -player.height / 2, player.width, player.height);
            }
            ctx.restore(); 
        } else {
            ctx.fillStyle = "red"; ctx.fillRect(player.x, player.y, player.width, player.height);
        }

        // Turtalar
        for (let p of pies) {
            if (images.pie.complete) {
                ctx.save();
                ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
                ctx.rotate(p.angle);
                ctx.drawImage(images.pie, -p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            } else {
                ctx.fillStyle = "orange"; ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }
    }

    function gameOver() {
        gameRunning = false;
        
        // Müzik dursa iyi olur
        bgMusic.pause();
        bgMusic.currentTime = 0; 

        if(gameOverScreen) gameOverScreen.style.display = 'block';
        if(finalScoreElement) finalScoreElement.innerText = "Skorun: " + score;
    }

    window.resetGame = function() {
        score = 0;
        dropSpeedPPS = 400; 
        spawnInterval = 1500;
        spawnTimer = 0;
        lastTime = 0; 
        pies = [];
        player.facingRight = true; 
        player.isEating = false; 
        player.frameX = 0;
        
        // Yeniden başla deyince müziği tekrar başlat
        bgMusic.play().catch(e => console.log(e));

        if(scoreElement) scoreElement.innerText = "Skor: 0";
        if(gameOverScreen) gameOverScreen.style.display = 'none';
        
        gameRunning = true;
        requestAnimationFrame(update);
    }
});