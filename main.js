// ==========================================
// メインゲームロジック (main.js)
// ==========================================

let pointerDownPos = { x: 0, y: 0 };
let pointerDownTime = 0;

// はぎ取り用変数
let isHeroCarving = false;
let carveEndTime = 0;
let targetCarveDragon = null;

// --- アイテム使用処理 ---
useItemButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isGameStarted || isGameOver || inventory.count <= 0 || isHeroCarving) return;

    stats.hero.hp = stats.hero.maxHp; 
    inventory.count--;
    
    UI_hero.innerHTML = `<span style="color:#00ff00;">勇者: ${inventory.name}を使用して全回復！</span>`;
    flashModel(hero, 0x00ff00);
    updateUI();
});

window.addEventListener('pointerdown', (event) => {
    // はぎ取り中は操作不可
    if (!isGameStarted || isGameOver || isHeroKnockedBack || isHeroCarving) return;
    const now = Date.now();
    pointerDownPos = { x: event.clientX, y: event.clientY };
    pointerDownTime = now;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const aliveDragons = dragons.filter(d => d.userData.hp > 0);
    const intersects = raycaster.intersectObjects([ground, ...aliveDragons], true);
    
    if (intersects.length > 0) { 
        let hitObject = intersects[0].object;
        let rootObj = hitObject;
        while (rootObj && !rootObj.userData.isDragon && rootObj !== scene) rootObj = rootObj.parent;

        if (rootObj && rootObj.userData.isDragon) {
            let d = rootObj;
            if (d.userData.hp > 0 && now - lastAttackTime >= attackCooldown && !isHeroDashing) {
                const distance = hero.position.distanceTo(d.position);
                activeDragon = d; 
                if (distance < 4.0) {
                    UI_hero.innerText = "勇者: 【近接】剣！ (-20)"; flashModel(hero, 0x555500);
                    d.userData.hp -= stats.hero.atkMelee; d.userData.isAggro = true; lastAttackTime = now;
                } else if (distance < 15) {
                    UI_hero.innerText = "勇者: 【遠距離】魔法！"; flashModel(hero, 0x005555);
                    spawnProjectile('magic', hero.position.clone(), d.position.clone(), 'hero'); lastAttackTime = now;
                } else { UI_hero.innerText = "勇者: 遠すぎて攻撃が届かない！"; }
                updateUI();
            }
        } else if (hitObject === ground) {
            let p = intersects[0].point;
            p.x = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.x));
            p.z = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.z));
            targetPosition.copy(p); targetPosition.y = 0; 
        }
    }
});

window.addEventListener('pointerup', (event) => {
    if (!isGameStarted || isGameOver || isHeroKnockedBack || isHeroCarving) return;
    const now = Date.now();
    const timeDiff = now - pointerDownTime;
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (timeDiff < 400 && dist > 30) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1; 
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            let p = intersects[0].point;
            p.x = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.x));
            p.z = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.z));
            targetPosition.copy(p); targetPosition.y = 0; 

            if (stats.hero.stamina >= DASH_STAMINA_COST && !isHeroDashing) {
                stats.hero.stamina -= DASH_STAMINA_COST;
                isHeroDashing = true; isHeroInvincible = true;
                dashEndTime = now + 400; invincibleEndTime = now + 600; 
                UI_hero.innerHTML = "<span class='evade-text'>勇者: 【回避】無敵ダッシュ！</span>";
                hero.traverse((child) => { if (child.isMesh) { child.material.transparent = true; child.material.opacity = 0.5; child.material.emissive.setHex(0x0055ff); } });
                updateUI();
            }
        }
    }
});

function flashModel(model, hexColor) {
    model.traverse((child) => { if (child.isMesh && !(model === hero && isHeroInvincible)) child.material.emissive.setHex(hexColor); });
    setTimeout(() => {
        if(!isGameOver) {
            model.traverse((child) => { 
                if (child.isMesh) {
                    if (model === hero && isHeroInvincible) child.material.emissive.setHex(0x0055ff); 
                    else child.material.emissive.setHex(0x000000); 
                }
            });
        }
    }, 300);
}

function spawnProjectile(type, startPos, targetPos, attackerName) {
    let color = (type === 'magic') ? 0x00ffff : 0xff00ff; 
    let size = (type === 'magic') ? 0.4 : 0.8;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), new THREE.MeshBasicMaterial({ color: color }));
    mesh.position.copy(startPos); mesh.position.y += (type === 'magic' ? 1.0 : 2.5); scene.add(mesh);
    projectiles.push({ mesh: mesh, direction: new THREE.Vector3().subVectors(targetPos, startPos).normalize(), speed: (type === 'magic' ? 0.4 : 0.25), life: 100, attacker: attackerName });
}

function updateUI() {
    barHero.style.width = (Math.max(0, stats.hero.hp) / stats.hero.maxHp * 100) + '%'; 
    barStamina.style.width = (Math.max(0, stats.hero.stamina) / stats.hero.maxStamina * 100) + '%';
    UI_item.innerText = `${inventory.name}: ${inventory.count}回`;
    
    if (activeDragon && activeDragon.userData.hp > 0) {
        barDragon.style.width = (Math.max(0, activeDragon.userData.hp) / activeDragon.userData.maxHp * 100) + '%';
        UI_dragon.innerText = `ドラゴン (HP: ${activeDragon.userData.hp})`;
    } else { barDragon.style.width = '0%'; UI_dragon.innerText = `ターゲットなし`; }
    
    if (stats.hero.hp <= 0 && !isGameOver) {
        isGameOver = true; resultText.innerText = "GAME OVER..."; resultText.style.color = "#ff4444"; 
        resultText.style.display = "block"; retryButton.style.display = "block"; 
    }
}

retryButton.addEventListener('click', () => {
    stats.hero.hp = stats.hero.maxHp; stats.hero.stamina = stats.hero.maxStamina;
    inventory = { name: "回復薬", count: 3 };
    hero.position.set(0, 0, 0); hero.rotation.set(0, 0, 0); targetPosition.copy(hero.position);
    
    dragons.forEach((d, index) => {
        if (!d.parent) scene.add(d); 
        d.userData.hp = d.userData.maxHp; d.userData.isAggro = false; d.userData.state = 'idle'; d.userData.isDead = false;
        d.getObjectByName("head").rotation.x = 0; 
        d.rotation.z = 0; d.position.y = 0; // 倒れた状態をリセット
        
        let rx, rz, tooClose;
        do {
            rx = (Math.random() - 0.5) * (MAP_SIZE - 20); rz = (Math.random() - 0.5) * (MAP_SIZE - 20); tooClose = false;
            if (Math.abs(rx) < 20 && Math.abs(rz) < 20) { tooClose = true; continue; }
            for (let j = 0; j < index; j++) { if (Math.sqrt(Math.pow(rx - dragons[j].position.x, 2) + Math.pow(rz - dragons[j].position.z, 2)) < DRAGON_SPACING) { tooClose = true; break; } }
        } while (tooClose);
        d.position.set(rx, 0, rz); d.userData.targetPos.copy(d.position);
        d.traverse((c) => { if (c.isMesh) c.material.emissive.setHex(0x000000); });
    });
    activeDragon = null; isGameOver = false; isHeroKnockedBack = false; isHeroDashing = false; isHeroInvincible = false;
    isHeroCarving = false; targetCarveDragon = null; // はぎ取り状態リセット
    
    hero.traverse((child) => { if (child.isMesh) { child.material.transparent = false; child.material.opacity = 1.0; child.material.emissive.setHex(0x000000); } });
    for (let p of projectiles) scene.remove(p.mesh); projectiles = [];
    resultText.style.display = "none"; retryButton.style.display = "none"; updateUI();
});

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i]; p.mesh.position.addScaledVector(p.direction, p.speed); p.life--;
        let hitObstacle = false;
        for (let obs of obstacles) { if (Math.sqrt(Math.pow(p.mesh.position.x - obs.mesh.position.x, 2) + Math.pow(p.mesh.position.z - obs.mesh.position.z, 2)) < obs.radius) { hitObstacle = true; break; } }
        if (hitObstacle) { finalizeProjectile(i, false); continue; }

        let hitDragon = false;
        if (p.attacker === 'hero') {
            for (let d of dragons) {
                if (d.userData.hp > 0 && p.mesh.position.distanceTo(d.position) < 3) {
                    d.userData.hp -= stats.hero.atkRanged; d.userData.isAggro = true; activeDragon = d;
                    flashModel(d, 0x550000); finalizeProjectile(i, true); hitDragon = true; break;
                }
            }
        }
        if (hitDragon) continue;
        if (p.attacker === 'dragon' && p.mesh.position.distanceTo(hero.position) < 1.5) {
            if (!isHeroInvincible && !isHeroCarving) { stats.hero.hp -= stats.dragon.atkRanged; flashModel(hero, 0x550000); } 
            finalizeProjectile(i, true); continue;
        }
        if (p.life <= 0) finalizeProjectile(i, false);
    }
}
function finalizeProjectile(index, isHit) { if(projectiles[index]) { scene.remove(projectiles[index].mesh); projectiles.splice(index, 1); updateUI(); } }

function animate() {
    requestAnimationFrame(animate);
    if (!isGameStarted) return; 
    const now = Date.now();
    
    if (!isGameOver) {
        if (!isHeroDashing && stats.hero.stamina < stats.hero.maxStamina) { stats.hero.stamina = Math.min(stats.hero.maxStamina, stats.hero.stamina + STAMINA_REGEN_RATE); updateUI(); }
        if (isHeroDashing && now > dashEndTime) isHeroDashing = false;
        if (isHeroInvincible && now > invincibleEndTime) {
            isHeroInvincible = false;
            hero.traverse((child) => { if (child.isMesh) { child.material.transparent = false; child.material.opacity = 1.0; child.material.emissive.setHex(0x000000); } });
        }

        // --- はぎ取り中のアニメーション処理 ---
        if (isHeroCarving) {
            if (now > carveEndTime) {
                // はぎ取り終了
                isHeroCarving = false;
                hero.rotation.x = 0; hero.position.y = 0;
                
                inventory.name = "ドラゴン肉"; 
                inventory.count += 3; // 回復回数を3回追加
                UI_hero.innerHTML = "<span style='color:#ffff00; font-weight:bold;'>勇者: ドラゴン肉をGET！(回復+3) 🍖</span>";
                
                if (targetCarveDragon && targetCarveDragon.parent) scene.remove(targetCarveDragon);
                activeDragon = null; updateUI();
            } else {
                // ギコギコ動く(作業してる感を出す)
                hero.position.y = Math.abs(Math.sin(now / 50)) * 0.2; 
            }
        }

        let aliveCount = 0; let knockBackDragon = null;
        dragons.forEach(d => {
            if (d.userData.hp <= 0) { 
                // ドラゴンが死んだ瞬間の処理（1回だけ実行）
                if (!d.userData.isDead) {
                    d.userData.isDead = true;
                    d.rotation.z = Math.PI / 2; // コロンと倒れる
                    d.position.y = 0.5;
                    
                    isHeroCarving = true; carveEndTime = now + 1500; targetCarveDragon = d; // 1.5秒はぎ取り
                    
                    hero.lookAt(d.position.x, 0, d.position.z);
                    hero.rotation.x = Math.PI / 4; // しゃがむ
                    targetPosition.copy(hero.position); // 移動ストップ
                    
                    UI_hero.innerHTML = "<span style='color:#ffaa00;'>勇者: はぎ取り中... 🔪</span>";
                }
                return; 
            }
            aliveCount++;
            
            // はぎ取り中は他のドラゴンの動きを止める（親切設計）
            if (isHeroCarving) return;

            const dist = hero.position.distanceTo(d.position);
            if (dist < 2.5 && !isHeroKnockedBack && !isHeroInvincible && d.userData.isAggro) { knockBackDragon = d; activeDragon = d; }
            if (!d.userData.isAggro) { d.rotation.y += 0.002; return; }

            if (d.userData.state === 'normal' || d.userData.state === 'idle') {
                d.userData.state = 'normal'; 
                if (dist < 5.0) { 
                    flashModel(d, 0xff0000); 
                    if (!isHeroInvincible) stats.hero.hp -= stats.dragon.atkMelee; 
                    d.userData.state = 'spinning'; d.userData.spinStartTime = now; d.userData.initialRotY = d.rotation.y; d.userData.recoveryEndTime = now + spinDuration + 2500; 
                } else if (dist < 18) {
                    if (now - d.userData.lastMoveTime > 1500) {
                        spawnProjectile('breath', d.position.clone(), hero.position.clone(), 'dragon'); d.userData.lastMoveTime = now;
                    }
                }
            }
            if (d.userData.state === 'spinning') {
                const t = (now - d.userData.spinStartTime) / spinDuration;
                if (t <= 1.0) d.rotation.y = d.userData.initialRotY + (t * Math.PI * 2);
                else { d.userData.state = 'recovering'; d.rotation.y = d.userData.initialRotY; d.getObjectByName("head").rotation.x = 0.5; }
            } else if (d.userData.state === 'recovering') {
                if (now > d.userData.recoveryEndTime) { d.userData.state = 'normal'; d.getObjectByName("head").rotation.x = 0; }
            } else if (d.userData.state === 'normal') {
                if (now - d.userData.lastMoveTime > dragonMoveInterval) { d.userData.targetPos = hero.position.clone(); d.userData.targetPos.y = 0; d.userData.lastMoveTime = now; }
                d.position.lerp(d.userData.targetPos, 0.02); d.lookAt(hero.position.x, d.position.y, hero.position.z);
            }
        });

        if (aliveCount === 0 && !isGameOver) {
            isGameOver = true; resultText.innerText = "ALL QUEST CLEAR!!"; resultText.style.color = "#FFD700";
            resultText.style.display = "block"; retryButton.style.display = "block"; 
        }

        if (knockBackDragon) {
            isHeroKnockedBack = true; heroKnockBackEndTime = now + 500; 
            flashModel(hero, 0xff0000); stats.hero.hp -= stats.dragon.collisionDamage; updateUI();
            const knockBackDir = new THREE.Vector3().subVectors(hero.position, knockBackDragon.position).normalize();
            targetPosition.copy(hero.position).addScaledVector(knockBackDir, 5); targetPosition.y = 0;
            targetPosition.x = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, targetPosition.x)); targetPosition.z = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, targetPosition.z));
        }
        if (isHeroKnockedBack && now > heroKnockBackEndTime) isHeroKnockedBack = false;

        if (hero.position.distanceTo(targetPosition) > 0.1 && !isHeroCarving) {
            let moveSpeed = isHeroKnockedBack ? 0.2 : (isHeroDashing ? 0.35 : 0.08);
            hero.position.lerp(targetPosition, moveSpeed);
            for (let obs of obstacles) {
                const dx = hero.position.x - obs.mesh.position.x; const dz = hero.position.z - obs.mesh.position.z; const dist2D = Math.sqrt(dx * dx + dz * dz);
                if (dist2D < obs.radius) { const pushVec = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(obs.radius - dist2D); hero.position.add(pushVec); targetPosition.copy(hero.position); }
            }
            hero.position.x = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, hero.position.x)); hero.position.z = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, hero.position.z));
            if (!isHeroKnockedBack) hero.lookAt(targetPosition.x, hero.position.y, targetPosition.z);
        }
        camera.position.x = hero.position.x; camera.position.z = hero.position.z + 24; updateProjectiles(); updateUI(); 
    }
    renderer.render(scene, camera);
}

animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

startButton.addEventListener('click', () => { 
    titleScreen.style.opacity = '0'; 
    setTimeout(() => { 
        titleScreen.style.display = 'none'; 
        gameScreen.style.display = 'block'; 
        useItemButton.style.display = 'block';
        isGameStarted = true; 
    }, 800); 
});
