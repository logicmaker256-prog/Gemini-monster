// ==========================================
// 3Dモデル生成ファイル (models.js)
// ==========================================

function createHeroModel() {
    const hero = new THREE.Group();
    
    // 回転斬りなどのアニメーションを独立させるためのグループ
    const modelGroup = new THREE.Group();
    modelGroup.name = "modelGroup";
    hero.add(modelGroup);

    // 胴体
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), new THREE.MeshLambertMaterial({ color: 0x2266cc }));
    body.position.y = 1.2; modelGroup.add(body);
    
    // 頭
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0xffeebb }));
    head.position.y = 2.1; modelGroup.add(head);

    // 脚
    const legMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const legL = new THREE.Group(); legL.position.set(0.25, 0.6, 0); legL.name = "legL";
    const lLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), legMat); lLMesh.position.y = -0.3; legL.add(lLMesh);
    modelGroup.add(legL);

    const legR = new THREE.Group(); legR.position.set(-0.25, 0.6, 0); legR.name = "legR";
    const lRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), legMat); lRMesh.position.y = -0.3; legR.add(lRMesh);
    modelGroup.add(legR);

    // 右腕 ＆ 剣
    const armR = new THREE.Group(); armR.position.set(-0.55, 1.6, 0); armR.name = "armR";
    const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), new THREE.MeshLambertMaterial({ color: 0x2266cc }));
    armRMesh.position.y = -0.4; armR.add(armRMesh);
    
    // 剣（長くてカッコいいサイズに！）
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.3), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    sword.position.set(0, -0.8, 0.8); sword.rotation.x = Math.PI / 2; // 前方に構える
    armR.add(sword);
    modelGroup.add(armR);

    // 左腕（走る時のバランス用）
    const armL = new THREE.Group(); armL.position.set(0.55, 1.6, 0); armL.name = "armL";
    const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), new THREE.MeshLambertMaterial({ color: 0x2266cc }));
    armLMesh.position.y = -0.4; armL.add(armLMesh);
    modelGroup.add(armL);

    return hero;
}

function createDragonModel() {
    const dragon = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 3), new THREE.MeshLambertMaterial({ color: 0xaa2222 }));
    body.position.y = 1.2; body.name = "body"; dragon.add(body);

    const headGroup = new THREE.Group(); headGroup.position.set(0, 1.8, 1.5); headGroup.name = "headGroup";
    const upperHead = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1.2), new THREE.MeshLambertMaterial({ color: 0x881111 }));
    upperHead.position.set(0, 0.4, 0.6); headGroup.add(upperHead);

    const jaw = new THREE.Group(); jaw.position.set(0, 0, 0); jaw.name = "jaw";
    const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.0), new THREE.MeshLambertMaterial({ color: 0xccaaaa }));
    jawMesh.position.set(0, -0.15, 0.5); jaw.add(jawMesh); headGroup.add(jaw); dragon.add(headGroup);

    const wingGeo = new THREE.BoxGeometry(3.5, 0.1, 2); const wingMat = new THREE.MeshLambertMaterial({ color: 0x661111 });
    const wingL = new THREE.Group(); wingL.position.set(0.75, 1.8, 0); wingL.name = "wingL";
    const wLMesh = new THREE.Mesh(wingGeo, wingMat); wLMesh.position.set(1.75, 0, 0); wingL.add(wLMesh); dragon.add(wingL);

    const wingR = new THREE.Group(); wingR.position.set(-0.75, 1.8, 0); wingR.name = "wingR";
    const wRMesh = new THREE.Mesh(wingGeo, wingMat); wRMesh.position.set(-1.75, 0, 0); wingR.add(wRMesh); dragon.add(wingR);

    const legGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6); const legMat = new THREE.MeshLambertMaterial({ color: 0x881111 });
    const legL = new THREE.Group(); legL.position.set(0.8, 1.2, 0); legL.name = "legL";
    const lLMesh = new THREE.Mesh(legGeo, legMat); lLMesh.position.set(0, -0.6, 0); legL.add(lLMesh); dragon.add(legL);

    const legR = new THREE.Group(); legR.position.set(-0.8, 1.2, 0); legR.name = "legR";
    const lRMesh = new THREE.Mesh(legGeo, legMat); lRMesh.position.set(0, -0.6, 0); legR.add(lRMesh); dragon.add(legR);
    
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.5, 4), new THREE.MeshLambertMaterial({ color: 0xaa2222 }));
    tail.rotation.x = -Math.PI / 2; tail.position.set(0, 1.2, -2.5); tail.name = "tail"; dragon.add(tail);

    return dragon;
}

function createTree() {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2), new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
    trunk.position.y = 1.0; tree.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 8), new THREE.MeshLambertMaterial({ color: 0x2e8b57 }));
    leaves.position.y = 3.0; tree.add(leaves);
    return tree;
}
