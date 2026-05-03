// ==========================================
// 3Dモデル生成用ファイル (models.js)
// ==========================================

// 木のモデルを作る関数
function createTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 }); 
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x228b22 }); 
    
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.5), trunkMat);
    trunk.position.y = 1.25;
    
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 8), leafMat);
    leaves.position.y = 4.5;
    
    group.add(trunk, leaves);
    return group;
}

// 勇者のモデルを作る関数
function createHeroModel() {
    const group = new THREE.Group();
    const armorMat = new THREE.MeshLambertMaterial({ color: 0xdcdcdc });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffe4c4 });
    const swordMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.8), armorMat); body.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), skinMat); head.position.y = 1.6;
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.2), swordMat); sword.position.set(0.7, 0.8, 0.5); sword.rotation.x = Math.PI / 4;
    group.add(body, head, sword);
    return group;
}

// ドラゴンのモデルを作る関数
function createDragonModel() {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 4), skinMat); body.position.y = 1.5;
    
    const dragonHead = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 2), skinMat); 
    dragonHead.position.set(0, 2.5, 2.5);
    dragonHead.name = "head"; 
    
    const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), hornMat); horn1.position.set(0.4, 3.5, 2);
    const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), hornMat); horn2.position.set(-0.4, 3.5, 2);
    const wingGeo = new THREE.BoxGeometry(4, 0.2, 2);
    const wingL = new THREE.Mesh(wingGeo, skinMat); wingL.position.set(3, 2.5, 0); wingL.rotation.z = 0.4;
    const wingR = new THREE.Mesh(wingGeo, skinMat); wingR.position.set(-3, 2.5, 0); wingR.rotation.z = -0.4;
    const dragonTail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 9), skinMat); dragonTail.position.set(0, 1.2, -4.5); 
    
    group.add(body, dragonHead, horn1, horn2, wingL, wingR, dragonTail);
    group.userData.isDragon = true; 
    
    return group;
}
