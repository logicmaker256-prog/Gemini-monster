// ==========================================
// メインゲームロジック (main.js)
// ==========================================

let pointerDownPos = { x: 0, y: 0 }; let pointerDownTime = 0;
let isHeroCarving = false; let carveEndTime = 0; let targetCarveDragon = null;

// アニメーション・攻撃判定用
let isHeroAttacking = false; let heroAttackEndTime = 0;
let dragonsHitDuringDash = []; 

// ★現在のカメラターゲット高さを保持（setup.jsの初期値に合わせる）
let currentLookAtY = CAMERA_SETTINGS.search.lookAtY;

useItemButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isGameStarted || isGameOver || inventory.count <= 0 || isHeroCarving) return;
    stats.hero.hp = stats.hero.maxHp; inventory.count--;
    UI_hero.innerHTML = `<span style="color:#00ff00;">勇者: ${inventory.name}を使用して全回復！</span>`;
    flashModel(hero, 0x00ff00); updateUI();
});

window.addEventListener('pointerdown', (event) => {
    if (!isGameStarted || isGameOver || isHeroKnockedBack || isHeroCarving) return;
    const now = Date.now(); pointerDownPos = { x: event.clientX, y: event.clientY }; pointerDownTime = now;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const aliveDragons = dragons.filter(d => d.userData.hp > 0);
    const intersects = raycaster.intersectObjects([ground, ...aliveDragons], true);
    
    if (intersects.length > 0) { 
        let hitObject = intersects[0].object; let rootObj = hitObject;
        while (rootObj && !rootObj.userData.isDragon && rootObj !== scene) rootObj = rootObj.parent;

        if ((!rootObj || !rootObj.userData.isDragon) && hitObject === ground) {
            let p = intersects[0].point;
            let nearestDragon = null; let minD = 5.0; 
            for (let d of aliveDragons) {
                let dDist = d.position.distanceTo(p);
                if (dDist < minD) { minD = dDist; nearestDragon = d; }
            }
            if (nearestDragon) rootObj = nearestDragon;
        }

        if (rootObj && rootObj.userData.isDragon) {
            let d = rootObj;
            if (d.userData.hp > 0 && now - lastAttackTime >= attackCooldown && !isHeroDashing) {
                const distance = hero.position.distanceTo(d.position); activeDragon = d; 
                if (!d.userData.isAggro) { d.userData.isAggro = true; d.userData.state = 'intimidate'; d.userData.intimidateEndTime = now + 1500; }

                if (distance < 5.5) { 
                    UI_hero.innerText = "勇者: 【近接】剣！ (-20)"; flashModel(hero, 0x555500);
                    hero.lookAt(d.position.x, hero.position.y, d.position.z);
                    d.userData.hp -= stats.hero.atkMelee; lastAttackTime = now;
                    isHeroAttacking = true; heroAttackEndTime = now + 300; 
                } else if (distance < 25) { 
                    UI_hero.innerText = "勇者: 【遠距離】魔法！"; flashModel(hero, 0x005555);
                    hero.lookAt(d.position.x, hero.position.y, d.position.z); 
                    spawnProjectile('magic', hero.position.clone(), d.position.clone(), 'hero'); lastAttackTime = now;
                } else { UI_hero.innerText = "勇者: 遠すぎて攻撃が届かない！"; }
                updateUI();
                return; 
            }
        } 
        
        if (hitObject === ground) {
            let p = intersects[0].point;
            p.x = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.x)); p.z = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.z));
            targetPosition.copy(p); targetPosition.y = 0; 
        }
    }
});

window.addEventListener('pointerup', (event) => {
    if (!isGameStarted || isGameOver || isHeroKnockedBack || isHeroCarving) return;
    const now = Date.now(); const timeDiff = now - pointerDownTime;
    const dx = event.clientX - pointerDownPos.x; const dy = event.clientY - pointerDownPos.y; const dist = Math.sqrt(dx * dx + dy * dy);

    if (timeDiff < 400 && dist > 30) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera); const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            let p = intersects[0].point; p.x = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.x)); p.z = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, p.z));
            targetPosition.copy(p); targetPosition.y = 0; 

            if (stats.hero.stamina >= DASH_STAMINA_COST && !isHeroDashing) {
                stats.hero.stamina -= DASH_STAMINA_COST; isHeroDashing = true; isHeroInvincible = true;
                dashEndTime = now + 400; invincibleEndTime = now + 600; 
                dragonsHitDuringDash = []; 
                
                UI_hero.innerHTML = "<span class='evade-text'>勇者: 【回避】無敵の回転斬り！</span>";
                hero.traverse((child) => { if (child.isMesh) { child.material.transparent = true; child.material.opacity = 0.5; child.material.emissive.setHex(0x0055ff); } });
                updateUI();
            }
        }
    }
});
function flashModel(model, hexColor) {
    model.traverse((child) => { if (child.isMesh && !(model === hero && isHeroInvincible)) child.material.emissive.setHex(hexColor); });
    setTimeout(() => { if(!isGameOver) { model.traverse((child) => { if (child.isMesh) { if (model === hero && isHeroInvincible) child.material.emissive.setHex(0x0055ff); else child.material.emissive.setHex(0x000000); } }); } }, 300);
}

// ★魔法の軌道計算（ターゲットを体の中心にする）
function spawnProjectile(type, startPos, targetPos, attackerName) {
    let color = (type === 'magic') ? 0x00ffff : 0xff00ff; 
    let size = (type === 'magic') ? 0.6 : 0.8; 
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), new THREE.MeshBasicMaterial({ color: color }));
    mesh.position.copy(startPos); mesh.position.y += (type === 'magic' ? 1.0 : 2.5); scene.add(mesh);
    let targetCenter = targetPos.clone(); targetCenter.y += (type === 'magic' ? 1.5 : 1.0); 
    const dir = new THREE.Vector3().subVectors(targetCenter, mesh.position).normalize();
    projectiles.push({ mesh: mesh, direction: dir, speed: (type === 'magic' ? 0.4 : 0.25), life: 100, attacker: attackerName });
}

function updateUI() {
    barHero.style.width = (Math.max(0, stats.hero.hp) / stats.hero.maxHp * 100) + '%'; barStamina.style.width = (Math.max(0, stats.hero.stamina) / stats.hero.maxStamina * 100) + '%'; UI_item.innerText = `${inventory.name}: ${inventory.count}回`;
    if (activeDragon && activeDragon.userData.hp > 0) { barDragon.style.width = (Math.max(0, activeDragon.userData.hp) / activeDragon.userData.maxHp * 100) + '%'; UI_dragon.innerText = `ドラゴン (HP: ${activeDragon.userData.hp})`; } else { barDragon.style.width = '0%'; UI_dragon.innerText = `ターゲットなし`; }
    if (stats.hero.hp <= 0 && !isGameOver) { isGameOver = true; resultText.innerText = "GAME OVER..."; resultText.style.color = "#ff4444"; resultText.style.display = "block"; retryButton.style.display = "block"; }
}

// ★リトライボタン：リロードではなく初期化処理にする
retryButton.addEventListener('click', () => {
    // ヒーロー初期化
    stats.hero.hp = stats.hero.maxHp; stats.hero.stamina = stats.hero.maxStamina;
    inventory = { name: "回復薬", count: 3 };
    hero.position.set(0, 0, 0); hero.rotation.set(0, 0, 0); targetPosition.copy(hero.position);
    
    // ドラゴン初期化
    dragons.forEach((d, index) => {
        if (!d.parent) scene.add(d); 
        d.userData.hp = d.userData.maxHp; d.userData.isAggro = false; d.userData.state = 'idle'; d.userData.isDead = false;
        d.getObjectByName("headGroup").rotation.y = 0; d.getObjectByName("jaw").rotation.x = 0; d.getObjectByName("wingL").rotation.z = 0; d.getObjectByName("wingR").rotation.z = 0; d.getObjectByName("body").rotation.x = 0; d.getObjectByName("legL").rotation.x = 0; d.getObjectByName("legR").rotation.x = 0;
        d.rotation.z = 0; d.position.y = 0; 
        
        let rx, rz, tooClose;
        do {
            rx = (Math.random() - 0.5) * (MAP_SIZE - 20); rz = (Math.random() - 0.5) * (MAP_SIZE - 20); tooClose = false;
            if (Math.abs(rx) < 20 && Math.abs(rz) < 20) { tooClose = true; continue; }
            for (let j = 0; j < index; j++) { if (Math.sqrt(Math.pow(rx - dragons[j].position.x, 2) + Math.pow(rz - dragons[j].position.z, 2)) < DRAGON_SPACING) { tooClose = true; break; } }
        } while (tooClose);
        d.position.set(rx, 0, rz); d.userData.targetPos.copy(d.position);
        d.traverse((c) => { if (c.isMesh) c.material.emissive.setHex(0x000000); });
    });

    // カメラリセット
    targetCameraY = CAMERA_SETTINGS.search.y; targetCameraZ = CAMERA_SETTINGS.search.z; targetLookAtY = CAMERA_SETTINGS.search.lookAtY; currentLookAtY = CAMERA_SETTINGS.search.lookAtY; currentLerpSpeed = CAMERA_SETTINGS.search.lerpSpeed;
    camera.position.set(0, targetCameraY, targetCameraZ); camera.lookAt(0, currentLookAtY, 0);

    activeDragon = null; isGameOver = false; isHeroKnockedBack = false; isHeroDashing = false; isHeroInvincible = false; isHeroCarving = false; targetCarveDragon = null; 
    hero.traverse((child) => { if (child.isMesh) { child.material.transparent = false; child.material.opacity = 1.0; child.material.emissive.setHex(0x000000); } });
    for (let p of projectiles) scene.remove(p.mesh); projectiles = [];
    resultText.style.display = "none"; retryButton.style.display = "none"; updateUI();
});

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i]; p.mesh.position.addScaledVector(p.direction, p.speed); p.life--;
        let hitObstacle = false; for (let obs of obstacles) { if (Math.sqrt(Math.pow(p.mesh.position.x - obs.mesh.position.x, 2) + Math.pow(p.mesh.position.z - obs.mesh.position.z, 2)) < obs.radius) { hitObstacle = true; break; } }
        if (hitObstacle) { finalizeProjectile(i, false); continue; }
        let hitDragon = false;
        if (p.attacker === 'hero') {
            for (let d of dragons) {
                if (d.userData.hp > 0 && p.mesh.position.distanceTo(d.position) < 3) {
                    d.userData.hp -= stats.hero.atkRanged; 
                    if(!d.userData.isAggro) { d.userData.isAggro = true; d.userData.state = 'intimidate'; d.userData.intimidateEndTime = Date.now() + 1500; }
                    activeDragon = d; flashModel(d, 0x550000); finalizeProjectile(i, true); hitDragon = true; break;
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
        if (isHeroInvincible && now > invincibleEndTime) { isHeroInvincible = false; hero.traverse((child) => { if (child.isMesh) { child.material.transparent = false; child.material.opacity = 1.0; child.material.emissive.setHex(0x000000); } }); }

        let modelGroup = hero.getObjectByName("modelGroup");
        let legL = hero.getObjectByName("legL"); let legR = hero.getObjectByName("legR");
        let armR = hero.getObjectByName("armR"); let armL = hero.getObjectByName("armL");

        if (isHeroCarving) {
            if (now > carveEndTime) {
                isHeroCarving = false; hero.rotation.x = 0; modelGroup.position.y = 0;
                inventory.name = "ドラゴン肉"; inventory.count += 3; UI_hero.innerHTML = "<span style='color:#ffff00; font-weight:bold;'>勇者: ドラゴン肉をGET！(回復+3) 🍖</span>";
                if (targetCarveDragon && targetCarveDragon.parent) scene.remove(targetCarveDragon);
                activeDragon = null; updateUI();
            } else { modelGroup.position.y = Math.abs(Math.sin(now / 50)) * 0.2; }
        } else {
            modelGroup.position.y = 0; 
            
            if (isHeroDashing) {
                modelGroup.rotation.y -= 0.8; 
                dragons.forEach(d => {
                    if (d.userData.hp > 0 && !dragonsHitDuringDash.includes(d)) {
                        if (hero.position.distanceTo(d.position) < 4.5) { 
                            d.userData.hp -= stats.hero.atkMelee; 
                            if(!d.userData.isAggro) { d.userData.isAggro = true; d.userData.state = 'intimidate'; d.userData.intimidateEndTime = now + 1500; }
                            activeDragon = d; flashModel(d, 0x550000);
                            dragonsHitDuringDash.push(d); 
                            updateUI();
                        }
                    }
                });
            } else {
                modelGroup.rotation.y = 0; 

                if (isHeroAttacking) {
                    if (now < heroAttackEndTime) { armR.rotation.x = -Math.sin(((heroAttackEndTime - now) / 300) * Math.PI); } 
                    else { isHeroAttacking = false; armR.rotation.x = 0; }
                } else { armR.rotation.x = 0; }

                if (hero.position.distanceTo(targetPosition) > 0.1 && !isHeroKnockedBack) {
                    let walkSpeed = 100;
                    legL.rotation.x = Math.sin(now / walkSpeed) * 0.8; legR.rotation.x = Math.sin(now / walkSpeed + Math.PI) * 0.8;
                    armL.rotation.x = Math.sin(now / walkSpeed) * 0.5;
                    if(!isHeroAttacking) armR.rotation.x = Math.sin(now / walkSpeed + Math.PI) * 0.5;
                } else {
                    legL.rotation.x = 0; legR.rotation.x = 0; armL.rotation.x = 0;
                    if(!isHeroAttacking) armR.rotation.x = 0;
                }
            }
        }

        let aliveCount = 0; let knockBackDragon = null;
        dragons.forEach(d => {
            let body = d.getObjectByName("body"); let headGroup = d.getObjectByName("headGroup"); let jaw = d.getObjectByName("jaw");
            let wingL = d.getObjectByName("wingL"); let wingR = d.getObjectByName("wingR"); let tail = d.getObjectByName("tail");
            let legL_d = d.getObjectByName("legL"); let legR_d = d.getObjectByName("legR");

            if (d.userData.hp <= 0) { 
                if (!d.userData.isDead) {
                    d.userData.isDead = true; d.rotation.z = Math.PI / 2; d.position.y = 0.5;
                    if(jaw) jaw.rotation.x = 0; if(wingL) wingL.rotation.z = 0; if(wingR) wingR.rotation.z = 0; if(body) body.rotation.x = 0; if(legL_d) legL_d.rotation.x = 0; if(legR_d) legR_d.rotation.x = 0;
                    isHeroCarving = true; carveEndTime = now + 1500; targetCarveDragon = d; 
                    hero.lookAt(d.position.x, 0, d.position.z); hero.rotation.x = Math.PI / 4; targetPosition.copy(hero.position); 
                    UI_hero.innerHTML = "<span style='color:#ffaa00;'>勇者: はぎ取り中... 🔪</span>";
                }
                return; 
            }
            aliveCount++;
            if (isHeroCarving || !body) return; 

            const dist = hero.position.distanceTo(d.position);
            if (dist < 2.5 && !isHeroKnockedBack && !isHeroInvincible && d.userData.isAggro && d.userData.state !== 'interrupted' && d.userData.state !== 'recovering') { 
                knockBackDragon = d; activeDragon = d; 
            }
            
            if (!d.userData.isAggro) {
                if (dist < 18) { d.userData.isAggro = true; d.userData.state = 'intimidate'; d.userData.intimidateEndTime = now + 1500; } 
                else { d.rotation.y += 0.002; wingL.rotation.z = Math.sin(now / 300) * 0.1; wingR.rotation.z = -Math.sin(now / 300) * 0.1; return; }
            }

            if (d.userData.state === 'intimidate') {
                jaw.rotation.x = THREE.MathUtils.lerp(jaw.rotation.x, 0.8, 0.1); wingL.rotation.z = THREE.MathUtils.lerp(wingL.rotation.z, 0.7, 0.1); wingR.rotation.z = THREE.MathUtils.lerp(wingR.rotation.z, -0.7, 0.1); body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -0.4, 0.1); tail.rotation.x = THREE.MathUtils.lerp(tail.rotation.x, -Math.PI/2 + 0.3, 0.1); headGroup.rotation.y = Math.sin(now / 20) * 0.1;
                if (now > d.userData.intimidateEndTime) { d.userData.state = 'normal'; headGroup.rotation.y = 0; }
            
            } else if (d.userData.state === 'normal') {
                jaw.rotation.x = THREE.MathUtils.lerp(jaw.rotation.x, 0, 0.1); wingL.rotation.z = Math.sin(now / 150) * 0.2 + 0.2; wingR.rotation.z = -Math.sin(now / 150) * 0.2 - 0.2; body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -0.6, 0.1); tail.rotation.x = THREE.MathUtils.lerp(tail.rotation.x, -Math.PI/2 - 0.2, 0.1);
                legL_d.rotation.x = Math.sin(now / 80) * 0.8; legR_d.rotation.x = Math.sin(now / 80 + Math.PI) * 0.8;

                if (dist < 5.0 && now - d.userData.lastMoveTime > 1000) { 
                    d.userData.state = 'chargingSpin'; d.userData.chargeEndTime = now + 800; d.userData.hpAtChargeStart = d.userData.hp; 
                } else if (dist < 15 && now - d.userData.lastMoveTime > 1500) { spawnProjectile('breath', d.position.clone(), hero.position.clone(), 'dragon'); d.userData.lastMoveTime = now; }

                if (now - d.userData.lastMoveTime > dragonMoveInterval) { d.userData.targetPos = hero.position.clone(); d.userData.targetPos.y = 0; d.userData.lastMoveTime = now; }
                d.position.lerp(d.userData.targetPos, 0.025); d.lookAt(hero.position.x, d.position.y, hero.position.z);
            } else if (d.userData.state === 'chargingSpin') {
                body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0.4, 0.1); tail.rotation.x = THREE.MathUtils.lerp(tail.rotation.x, -Math.PI/2 + 0.8, 0.1);
                if (d.userData.hp < d.userData.hpAtChargeStart) { d.userData.state = 'interrupted'; d.userData.interruptedEndTime = now + 1000; } 
                else if (now > d.userData.chargeEndTime) {
                    d.userData.state = 'spinning'; d.userData.spinStartTime = now; d.userData.initialRotY = d.rotation.y; d.userData.recoveryEndTime = now + spinDuration + 2000;
                    if (dist < 5.5 && !isHeroInvincible && !isHeroDashing) { stats.hero.hp -= stats.dragon.atkMelee; flashModel(hero, 0xff0000); }
                }
            } else if (d.userData.state === 'interrupted') {
                body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -1.0, 0.2); headGroup.rotation.y = Math.sin(now / 50) * 0.2;
                if (now > d.userData.interruptedEndTime) { d.userData.state = 'normal'; updateUI(); }
            } else if (d.userData.state === 'spinning') {
                body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, 0.2); wingL.rotation.z = 0.5; wingR.rotation.z = -0.5; legL_d.rotation.x = 0; legR_d.rotation.x = 0;
                const t = (now - d.userData.spinStartTime) / spinDuration; if (t <= 1.0) d.rotation.y = d.userData.initialRotY + (t * Math.PI * 2); else { d.userData.state = 'recovering'; d.rotation.y = d.userData.initialRotY; }
            } else if (d.userData.state === 'recovering') {
                body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -0.6, 0.1); headGroup.rotation.x = Math.sin(now / 150) * 0.1 + 0.3; wingL.rotation.z = Math.sin(now / 200) * 0.1; wingR.rotation.z = -Math.sin(now / 200) * 0.1; legL_d.rotation.x = 0; legR_d.rotation.x = 0;
                if (now > d.userData.recoveryEndTime) { d.userData.state = 'normal'; headGroup.rotation.x = 0; }
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
            for (let obs of obstacles) { const dx = hero.position.x - obs.mesh.position.x; const dz = hero.position.z - obs.mesh.position.z; const dist2D = Math.sqrt(dx * dx + dz * dz); if (dist2D < obs.radius) { const pushVec = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(obs.radius - dist2D); hero.position.add(pushVec); targetPosition.copy(hero.position); } }
            hero.position.x = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, hero.position.x)); hero.position.z = Math.max(-BOUNDARY + 1, Math.min(BOUNDARY - 1, hero.position.z));
            if (!isHeroKnockedBack) hero.lookAt(targetPosition.x, hero.position.y, targetPosition.z);
        }

        // --- ★【改善】動的カメラシステム ---
        // 戦闘中（アグロ状態の敵がいる）か、探索中かを判定
        const battlingDragon = dragons.find(d => d.userData.hp > 0 && d.userData.isAggro);
        
        if (battlingDragon) {
            // 戦闘中は拡大アングル
            targetCameraY = CAMERA_SETTINGS.battle.y;
            targetCameraZ = CAMERA_SETTINGS.battle.z;
            targetLookAtY = CAMERA_SETTINGS.battle.lookAtY;
            currentLerpSpeed = CAMERA_SETTINGS.battle.lerpSpeed;
        } else if (!isHeroCarving) {
            // 探索中は通常アングル
            targetCameraY = CAMERA_SETTINGS.search.y;
            targetCameraZ = CAMERA_SETTINGS.search.z;
            targetLookAtY = CAMERA_SETTINGS.search.lookAtY;
            currentLerpSpeed = CAMERA_SETTINGS.search.lerpSpeed;
        }
        // ※はぎ取り中はアングルを固定（PointerUpで設定済み）

        // カメラ位置をスムーズに移動（Lerp）
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY + hero.position.y, currentLerpSpeed);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCameraZ + hero.position.z, currentLerpSpeed);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, hero.position.x, currentLerpSpeed);

        // 注視点もスムーズに移動（Lerp）
        currentLookAtY = THREE.MathUtils.lerp(currentLookAtY, targetLookAtY + hero.position.y, currentLerpSpeed);
        camera.lookAt(hero.position.x, currentLookAtY, hero.position.z);

        updateProjectiles(); updateUI(); 
    }
    renderer.render(scene, camera);
}

animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

startButton.addEventListener('click', () => { titleScreen.style.opacity = '0'; setTimeout(() => { titleScreen.style.display = 'none'; gameScreen.style.display = 'block'; useItemButton.style.display = 'block'; isGameStarted = true; }, 800); });
