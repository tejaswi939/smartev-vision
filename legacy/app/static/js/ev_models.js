/**
 * ev_models.js — Procedural EV Model Generator
 * 
 * Generates three distinct electric vehicle models using Three.js primitives:
 *   Model A "Aero" — Sleek sedan with low profile
 *   Model B "Terra" — Tall SUV with boxy, rugged design
 *   Model C "Flux" — Low, wide sports car with aggressive styling
 * 
 * Each model returns a THREE.Group with named children for raycasting identification.
 * Uses global THREE namespace (no ES6 modules).
 */

(function () {
    'use strict';

    // ========================================================================
    // SHARED MATERIALS
    // ========================================================================

    /**
     * Creates the car body paint material with realistic automotive finish.
     * Uses MeshPhysicalMaterial for clearcoat effect (like real car paint).
     * @param {number} color - Hex color value
     * @returns {THREE.MeshPhysicalMaterial}
     */
    function createBodyMaterial(color) {
        return new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.92,
            roughness: 0.12,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.2
        });
    }

    /**
     * Glass material using MeshPhysicalMaterial for transparency.
     * Note: r128 doesn't support 'transmission', so we use opacity + transparent.
     */
    function createGlassMaterial() {
        return new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            metalness: 0.1,
            roughness: 0.05,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
    }

    /** Dark rubber material for tires */
    function createTireMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x141414,
            metalness: 0.05,
            roughness: 0.85
        });
    }

    /** Metallic wheel rim material */
    function createRimMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xf3f3f5,
            metalness: 1.0,
            roughness: 0.06
        });
    }

    /** White emissive material for headlights */
    function createHeadlightMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xccddff,
            emissiveIntensity: 2.0
        });
    }

    /** Red emissive material for taillights */
    function createTaillightMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff2200,
            emissiveIntensity: 1.5
        });
    }

    /** Interior dashboard material */
    function createDashboardMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.1,
            roughness: 0.8
        });
    }

    /** Interior seat material (leather-like) */
    function createSeatMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.0,
            roughness: 0.6
        });
    }

    /** Chrome/trim material */
    function createChromeMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.95,
            roughness: 0.05
        });
    }

    // ========================================================================
    // SHARED COMPONENTS
    // ========================================================================

    /**
     * Creates a single wheel assembly (tire + rim + hub).
     * The wheel is oriented so it spins around the X axis (lying on its side).
     * @param {number} radius - Outer tire radius
     * @param {number} width - Tire width
     * @returns {THREE.Group}
     */
    function createWheel(radius, width) {
        var wheelGroup = new THREE.Group();
        width = width || 0.25;

        // Tire — torus for realistic rounded shape
        var tireGeometry = new THREE.TorusGeometry(radius - 0.04, 0.06, 12, 32);
        var tire = new THREE.Mesh(tireGeometry, createTireMaterial());
        wheelGroup.add(tire);

        // Rim — cylinder disc inside the tire
        var rimGeometry = new THREE.CylinderGeometry(radius - 0.08, radius - 0.08, width * 0.5, 32);
        var rim = new THREE.Mesh(rimGeometry, createRimMaterial());
        rim.rotation.x = Math.PI / 2;
        wheelGroup.add(rim);

        // Brake Disc — shiny metallic circle behind the spokes
        var brakeDiscGeo = new THREE.CylinderGeometry(radius - 0.12, radius - 0.12, 0.02, 24);
        var brakeDiscMat = new THREE.MeshStandardMaterial({
            color: 0xbbbbbb,
            metalness: 0.9,
            roughness: 0.1
        });
        var brakeDisc = new THREE.Mesh(brakeDiscGeo, brakeDiscMat);
        brakeDisc.rotation.x = Math.PI / 2;
        brakeDisc.position.z = -width * 0.1;
        wheelGroup.add(brakeDisc);

        // Brake Caliper — bright sport-red block clamped onto the disc
        var caliperGeo = new THREE.BoxGeometry(0.06, radius * 0.45, 0.05);
        var caliperMat = new THREE.MeshStandardMaterial({
            color: 0xff0022,
            metalness: 0.4,
            roughness: 0.2
        });
        var caliper = new THREE.Mesh(caliperGeo, caliperMat);
        caliper.position.set(0, radius * 0.35, -width * 0.08);
        caliper.rotation.z = -0.3; // Sporty angled position
        wheelGroup.add(caliper);

        // Hub cap — small cylinder in center
        var hubGeometry = new THREE.CylinderGeometry(0.07, 0.07, width * 0.6, 16);
        var hub = new THREE.Mesh(hubGeometry, createChromeMaterial());
        hub.rotation.x = Math.PI / 2;
        wheelGroup.add(hub);

        // Alloy spoke pattern — 5-twin-spoke sporty pattern
        // Alloy spoke pattern — 5-twin-spoke sporty pattern (slim lightweight design)
        for (var i = 0; i < 5; i++) {
            var angle = (i * Math.PI * 2) / 5;
            
            // Twin spoke 1
            var spoke1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, radius * 0.75, width * 0.18), createRimMaterial());
            spoke1.rotation.z = angle + 0.08;
            spoke1.position.set(Math.sin(angle) * radius * 0.12, Math.cos(angle) * radius * 0.12, 0);
            wheelGroup.add(spoke1);

            // Twin spoke 2
            var spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, radius * 0.75, width * 0.18), createRimMaterial());
            spoke2.rotation.z = angle - 0.08;
            spoke2.position.set(Math.sin(angle) * radius * 0.12, Math.cos(angle) * radius * 0.12, 0);
            wheelGroup.add(spoke2);
        }

        return wheelGroup;
    }

    /**
     * Creates an LED-style headlight unit.
     * @param {string} style - "slim" | "round" | "angular"
     * @returns {THREE.Group}
     */
    function createHeadlight(style) {
        var group = new THREE.Group();
        var mat = createHeadlightMaterial();

        if (style === 'slim') {
            // Thin horizontal LED bar
            var barGeo = new THREE.BoxGeometry(0.04, 0.06, 0.3);
            var bar = new THREE.Mesh(barGeo, mat);
            group.add(bar);
            // Accent strip below
            var stripGeo = new THREE.BoxGeometry(0.02, 0.02, 0.25);
            var strip = new THREE.Mesh(stripGeo, createChromeMaterial());
            strip.position.y = -0.05;
            group.add(strip);
        } else if (style === 'round') {
            // Circular LED ring
            var ringGeo = new THREE.TorusGeometry(0.1, 0.02, 8, 16);
            var ring = new THREE.Mesh(ringGeo, mat);
            ring.rotation.y = Math.PI / 2;
            group.add(ring);
            // Inner fill
            var fillGeo = new THREE.CircleGeometry(0.08, 16);
            var fill = new THREE.Mesh(fillGeo, mat);
            fill.rotation.y = Math.PI / 2;
            group.add(fill);
        } else {
            // Angular / aggressive
            var angGeo = new THREE.BoxGeometry(0.04, 0.04, 0.35);
            var ang = new THREE.Mesh(angGeo, mat);
            ang.rotation.z = 0.15;
            group.add(ang);
            var ang2Geo = new THREE.BoxGeometry(0.04, 0.04, 0.2);
            var ang2 = new THREE.Mesh(ang2Geo, mat);
            ang2.position.y = -0.06;
            ang2.rotation.z = -0.1;
            group.add(ang2);
        }

        return group;
    }

    /**
     * Creates a basic car interior (dashboard, seats, steering wheel).
     * Positioned so the interior sits at the correct height inside the cabin.
     * @param {number} cabinWidth - Width of the cabin interior
     * @param {number} cabinLength - Length of the cabin interior  
     * @param {number} floorY - Y position of the cabin floor
     * @returns {THREE.Group}
     */
    function createInterior(cabinWidth, cabinLength, floorY) {
        var interior = new THREE.Group();
        cabinWidth = cabinWidth || 1.4;
        cabinLength = cabinLength || 2.0;
        floorY = floorY || 0.5;

        var dashMat = createDashboardMaterial();
        var seatMat = createSeatMaterial();
        var chromeMat = createChromeMaterial();

        // 1. Curved Dashboard — wide premium black panel
        var dashGeo = new THREE.BoxGeometry(cabinWidth * 0.95, 0.35, 0.2);
        var dashboard = new THREE.Mesh(dashGeo, dashMat);
        dashboard.position.set(0, floorY + 0.45, -cabinLength * 0.38);
        interior.add(dashboard);

        // 2. Mercedes-style "Hyperscreen" glass dashboard — glowing executive screen stretching across
        var screenGeo = new THREE.BoxGeometry(cabinWidth * 0.85, 0.18, 0.02);
        var screenMat = new THREE.MeshPhysicalMaterial({
            color: 0x051a3a,
            emissive: 0x0a22ff,
            emissiveIntensity: 1.2,
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0
        });
        var screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, floorY + 0.46, -cabinLength * 0.38 + 0.10);
        interior.add(screen);

        // 3. Sports Steering Wheel — dual-spoke chrome-accented wheel
        var steeringGroup = new THREE.Group();
        var steeringGeo = new THREE.TorusGeometry(0.18, 0.018, 12, 32);
        var steering = new THREE.Mesh(steeringGeo, dashMat);
        steeringGroup.add(steering);
        
        // Steering wheel spokes with metallic detail
        var spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), chromeMat);
        steeringGroup.add(spokeH);
        var spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.02), dashMat);
        spokeV.position.y = -0.07;
        steeringGroup.add(spokeV);
        
        steeringGroup.position.set(-0.35, floorY + 0.52, -cabinLength * 0.25);
        steeringGroup.rotation.x = Math.PI / 6; // tilted sporty angle
        interior.add(steeringGroup);

        // Steering column
        var columnGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.35, 12);
        var column = new THREE.Mesh(columnGeo, dashMat);
        column.position.set(-0.35, floorY + 0.42, -cabinLength * 0.32);
        column.rotation.x = Math.PI / 6;
        interior.add(column);

        // 4. Front Luxury Bucket Seats (driver + passenger)
        var seatPositions = [-0.38, 0.38];
        for (var i = 0; i < seatPositions.length; i++) {
            var seatGroup = new THREE.Group();
            
            // Seat bottom cushion
            var baseGeo = new THREE.BoxGeometry(0.48, 0.14, 0.48);
            var seatBase = new THREE.Mesh(baseGeo, seatMat);
            seatBase.position.y = floorY + 0.18;
            seatGroup.add(seatBase);
            
            // Seat side bolsters (for sporty look)
            var bolsterL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.48), seatMat);
            bolsterL.position.set(-0.21, floorY + 0.22, 0);
            seatGroup.add(bolsterL);
            var bolsterR = bolsterL.clone();
            bolsterR.position.x = 0.21;
            seatGroup.add(bolsterR);

            // Seat back cushion (curved / supportive)
            var backGeo = new THREE.BoxGeometry(0.44, 0.65, 0.10);
            var seatBack = new THREE.Mesh(backGeo, seatMat);
            seatBack.position.set(0, floorY + 0.52, -0.22);
            seatBack.rotation.x = 0.12; // Reclined
            seatGroup.add(seatBack);
            
            // Seat back side bolsters
            var backBolsterL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.12), seatMat);
            backBolsterL.position.set(-0.21, floorY + 0.50, -0.20);
            backBolsterL.rotation.x = 0.12;
            seatGroup.add(backBolsterL);
            var backBolsterR = backBolsterL.clone();
            backBolsterR.position.x = 0.21;
            seatGroup.add(backBolsterR);

            // Headrest
            var headGeo = new THREE.BoxGeometry(0.22, 0.18, 0.08);
            var headrest = new THREE.Mesh(headGeo, seatMat);
            headrest.position.set(0, floorY + 0.86, -0.26);
            seatGroup.add(headrest);

            seatGroup.position.set(seatPositions[i], 0, -cabinLength * 0.08);
            interior.add(seatGroup);
        }

        // 5. Rear Luxury Bench seat
        var rearBaseGeo = new THREE.BoxGeometry(cabinWidth * 0.85, 0.14, 0.44);
        var rearBase = new THREE.Mesh(rearBaseGeo, seatMat);
        rearBase.position.set(0, floorY + 0.16, cabinLength * 0.22);
        interior.add(rearBase);

        var rearBackGeo = new THREE.BoxGeometry(cabinWidth * 0.82, 0.55, 0.10);
        var rearBack = new THREE.Mesh(rearBackGeo, seatMat);
        rearBack.position.set(0, floorY + 0.45, cabinLength * 0.22 + 0.20);
        rearBack.rotation.x = 0.16;
        interior.add(rearBack);

        // 6. Premium Center Console
        var consoleGeo = new THREE.BoxGeometry(0.24, 0.25, cabinLength * 0.55);
        var centerConsole = new THREE.Mesh(consoleGeo, dashMat);
        centerConsole.position.set(0, floorY + 0.18, -cabinLength * 0.1);
        interior.add(centerConsole);
        
        // Armrest cushion on center console
        var armrestGeo = new THREE.BoxGeometry(0.22, 0.06, cabinLength * 0.3);
        var armrest = new THREE.Mesh(armrestGeo, seatMat);
        armrest.position.set(0, floorY + 0.31, -cabinLength * 0.02);
        interior.add(armrest);
        
        // Metallic gear selector / dashboard trim
        var trimGeo = new THREE.BoxGeometry(0.18, 0.01, cabinLength * 0.25);
        var trim = new THREE.Mesh(trimGeo, chromeMat);
        trim.position.set(0, floorY + 0.315, -cabinLength * 0.22);
        interior.add(trim);

        return interior;
    }

    // ========================================================================
    // MODEL A — "AERO" SEDAN
    // ========================================================================

    /**
     * Builds the Aero sedan: sleek, low-profile EV with smooth curves.
     * Overall dimensions: ~4.5m long, ~1.8m wide, ~1.4m tall
     * @param {number} bodyColor - Hex color for body paint
     * @returns {THREE.Group}
     */
    function buildModelA(bodyColor) {
        bodyColor = bodyColor || 0x2255cc;
        var car = new THREE.Group();
        var bodyMat = createBodyMaterial(bodyColor);
        var glassMat = createGlassMaterial();
        var chromeMat = createChromeMaterial();

        // === BODY ===
        var bodyGroup = new THREE.Group();
        bodyGroup.name = 'body';

        // Main lower body core (long, rounded look)
        var lowerGeo = new THREE.BoxGeometry(4.4, 0.45, 1.82);
        var lowerBody = new THREE.Mesh(lowerGeo, bodyMat);
        lowerBody.position.set(0, 0.5, 0);
        bodyGroup.add(lowerBody);

        // Aerodynamic tapering segments for front and rear
        var frontTaper = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.38, 1.76), bodyMat);
        frontTaper.position.set(1.9, 0.45, 0);
        frontTaper.rotation.z = 0.08;
        bodyGroup.add(frontTaper);

        var rearTaper = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.38, 1.76), bodyMat);
        rearTaper.position.set(-1.9, 0.45, 0);
        rearTaper.rotation.z = -0.06;
        bodyGroup.add(rearTaper);

        // Smooth side skirts
        var skirtL = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
        skirtL.position.set(0, 0.28, 0.92);
        bodyGroup.add(skirtL);
        var skirtR = skirtL.clone();
        skirtR.position.z = -0.92;
        bodyGroup.add(skirtR);

        // Sweeping roof arches (front/rear segments to make it curved)
        var roofMid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.58), bodyMat);
        roofMid.position.set(-0.1, 1.05, 0);
        bodyGroup.add(roofMid);

        var roofFrontSlope = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.56), bodyMat);
        roofFrontSlope.position.set(0.9, 0.95, 0);
        roofFrontSlope.rotation.z = 0.32; // arching down to front
        bodyGroup.add(roofFrontSlope);

        var roofRearSlope = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.56), bodyMat);
        roofRearSlope.position.set(-1.1, 0.92, 0);
        roofRearSlope.rotation.z = -0.28; // arching down to rear
        bodyGroup.add(roofRearSlope);

        car.add(bodyGroup);

        // === HOOD ===
        var hoodGroup = new THREE.Group();
        hoodGroup.name = 'hood';
        // Sleek, sloped hood
        var hoodGeo = new THREE.BoxGeometry(1.2, 0.06, 1.72);
        var hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(1.4, 0.72, 0);
        hood.rotation.z = 0.08;
        hoodGroup.add(hood);
        
        // Premium front glossy panel (Mercedes star pattern grille)
        var grilleGeo = new THREE.BoxGeometry(0.06, 0.38, 1.25);
        var grilleMat = new THREE.MeshPhysicalMaterial({
            color: 0x050508,
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0
        });
        var grille = new THREE.Mesh(grilleGeo, grilleMat);
        grille.position.set(2.31, 0.44, 0);
        hoodGroup.add(grille);

        // Mercedes emblem center star
        var starGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 24);
        var star = new THREE.Mesh(starGeo, chromeMat);
        star.rotation.y = Math.PI / 2;
        star.position.set(2.345, 0.44, 0);
        hoodGroup.add(star);

        // Star spokes
        for (var i = 0; i < 3; i++) {
            var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, 0.02), chromeMat);
            spoke.rotation.x = (i * Math.PI * 2) / 3;
            spoke.position.set(2.345, 0.44, 0);
            spoke.rotation.y = Math.PI / 2;
            hoodGroup.add(spoke);
        }

        car.add(hoodGroup);

        // === ROOF ===
        var roofGroup = new THREE.Group();
        roofGroup.name = 'roof';
        // Glossy black panoramic glass roof
        var roofPanelGeo = new THREE.BoxGeometry(1.6, 0.04, 1.48);
        var roofPanelMat = new THREE.MeshStandardMaterial({ color: 0x08080f, roughness: 0.05, metalness: 0.9 });
        var roofPanel = new THREE.Mesh(roofPanelGeo, roofPanelMat);
        roofPanel.position.set(-0.1, 1.28, 0);
        roofGroup.add(roofPanel);
        
        // Roof side frames (body color)
        var frameL = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.08), bodyMat);
        frameL.position.set(-0.1, 1.28, 0.76);
        roofGroup.add(frameL);
        var frameR = frameL.clone();
        frameR.position.z = -0.76;
        roofGroup.add(frameR);
        
        car.add(roofGroup);

        // === DOORS ===
        var doorsGroup = new THREE.Group();
        doorsGroup.name = 'doors';
        var doorPositions = [
            { x: 0.45, z: 0.92 }, { x: -0.45, z: 0.92 },
            { x: 0.45, z: -0.92 }, { x: -0.45, z: -0.92 }
        ];
        for (var d = 0; d < doorPositions.length; d++) {
            var doorGeo = new THREE.BoxGeometry(0.88, 0.58, 0.03);
            var door = new THREE.Mesh(doorGeo, bodyMat);
            door.position.set(doorPositions[d].x, 0.68, doorPositions[d].z);
            doorsGroup.add(door);
            
            var handleGeo = new THREE.BoxGeometry(0.12, 0.018, 0.015);
            var handle = new THREE.Mesh(handleGeo, chromeMat);
            handle.position.set(doorPositions[d].x + 0.22, 0.78, doorPositions[d].z + (doorPositions[d].z > 0 ? 0.02 : -0.02));
            doorsGroup.add(handle);
        }
        car.add(doorsGroup);

        // === WINDSHIELD ===
        var windshieldGroup = new THREE.Group();
        windshieldGroup.name = 'windshield';
        var wsGeo = new THREE.PlaneGeometry(1.48, 0.65);
        var windshield = new THREE.Mesh(wsGeo, glassMat);
        windshield.position.set(0.9, 1.05, 0);
        windshield.rotation.y = 0;
        windshield.rotation.z = -0.52; // Sleek aerodynamically raked angle
        windshieldGroup.add(windshield);
        car.add(windshieldGroup);

        // === REAR WINDOW ===
        var rearWindowGroup = new THREE.Group();
        rearWindowGroup.name = 'rear_window';
        var rwGeo = new THREE.PlaneGeometry(1.36, 0.72);
        var rearWindow = new THREE.Mesh(rwGeo, glassMat);
        rearWindow.position.set(-1.25, 0.98, 0);
        rearWindow.rotation.z = 0.48;
        rearWindowGroup.add(rearWindow);
        car.add(rearWindowGroup);

        // === WHEELS ===
        var wheelsGroup = new THREE.Group();
        wheelsGroup.name = 'wheels';
        var wheelPositions = [
            { x: 1.35, y: 0.35, z: 0.95 },
            { x: 1.35, y: 0.35, z: -0.95 },
            { x: -1.35, y: 0.35, z: 0.95 },
            { x: -1.35, y: 0.35, z: -0.95 }
        ];
        for (var w = 0; w < wheelPositions.length; w++) {
            var wheel = createWheel(0.35, 0.24);
            wheel.position.set(wheelPositions[w].x, wheelPositions[w].y, wheelPositions[w].z);
            wheel.rotation.y = Math.PI / 2;
            wheelsGroup.add(wheel);
        }
        car.add(wheelsGroup);

        // === HEADLIGHTS ===
        var headlightsGroup = new THREE.Group();
        headlightsGroup.name = 'headlights';
        var hlLeft = createHeadlight('slim');
        hlLeft.position.set(2.28, 0.63, 0.62);
        hlLeft.rotation.y = 0.2;
        headlightsGroup.add(hlLeft);
        
        var hlRight = createHeadlight('slim');
        hlRight.position.set(2.28, 0.63, -0.62);
        hlRight.rotation.y = -0.2;
        headlightsGroup.add(hlRight);
        
        // Full width LED light strip
        var lightBarGeo = new THREE.BoxGeometry(0.02, 0.02, 1.2);
        var lightBar = new THREE.Mesh(lightBarGeo, createHeadlightMaterial());
        lightBar.position.set(2.32, 0.63, 0);
        headlightsGroup.add(lightBar);
        car.add(headlightsGroup);

        // === TAILLIGHTS ===
        var taillightsGroup = new THREE.Group();
        taillightsGroup.name = 'taillights';
        var tlMat = createTaillightMaterial();
        
        var tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), tlMat);
        tlLeft.position.set(-2.28, 0.62, 0.6);
        taillightsGroup.add(tlLeft);
        
        var tlRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.25), tlMat);
        tlRight.position.set(-2.28, 0.62, -0.6);
        taillightsGroup.add(tlRight);
        
        // Connecting full-width rear light bar
        var tailBarGeo = new THREE.BoxGeometry(0.02, 0.02, 1.3);
        var tailBar = new THREE.Mesh(tailBarGeo, tlMat);
        tailBar.position.set(-2.29, 0.62, 0);
        taillightsGroup.add(tailBar);
        car.add(taillightsGroup);

        // === BUMPERS ===
        var frontBumperGroup = new THREE.Group();
        frontBumperGroup.name = 'bumper_front';
        var fbGeo = new THREE.BoxGeometry(0.12, 0.3, 1.84);
        var fb = new THREE.Mesh(fbGeo, bodyMat);
        fb.position.set(2.26, 0.38, 0);
        frontBumperGroup.add(fb);
        
        // Aerodynamic lower lip spoiler (AMG style)
        var lipGeo = new THREE.BoxGeometry(0.2, 0.04, 1.86);
        var lip = new THREE.Mesh(lipGeo, new THREE.MeshStandardMaterial({ color: 0x15151a, metalness: 0.9 }));
        lip.position.set(2.25, 0.24, 0);
        frontBumperGroup.add(lip);
        car.add(frontBumperGroup);

        var rearBumperGroup = new THREE.Group();
        rearBumperGroup.name = 'bumper_rear';
        var rbGeo = new THREE.BoxGeometry(0.12, 0.32, 1.82);
        var rb = new THREE.Mesh(rbGeo, bodyMat);
        rb.position.set(-2.25, 0.38, 0);
        rearBumperGroup.add(rb);
        
        // Diffuser
        var diffuserGeo = new THREE.BoxGeometry(0.1, 0.08, 1.3);
        var diffuser = new THREE.Mesh(diffuserGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
        diffuser.position.set(-2.29, 0.28, 0);
        rearBumperGroup.add(diffuser);
        car.add(rearBumperGroup);

        // === MIRRORS ===
        var mirrorsGroup = new THREE.Group();
        mirrorsGroup.name = 'mirrors';
        var mirrorGeo = new THREE.BoxGeometry(0.08, 0.05, 0.15);
        var mirrorLeft = new THREE.Mesh(mirrorGeo, bodyMat);
        mirrorLeft.position.set(0.72, 0.86, 0.96);
        mirrorsGroup.add(mirrorLeft);
        
        var mirrorRight = new THREE.Mesh(mirrorGeo.clone(), bodyMat);
        mirrorRight.position.set(0.72, 0.86, -0.96);
        mirrorsGroup.add(mirrorRight);
        car.add(mirrorsGroup);

        // === INTERIOR ===
        var interiorGroup = createInterior(1.4, 2.1, 0.45);
        interiorGroup.name = 'interior';
        car.add(interiorGroup);

        // Side windows
        var sideWindowGeo = new THREE.PlaneGeometry(1.72, 0.42);
        var swLeft = new THREE.Mesh(sideWindowGeo, glassMat);
        swLeft.position.set(-0.05, 0.92, 0.91);
        car.add(swLeft);
        var swRight = new THREE.Mesh(sideWindowGeo.clone(), glassMat);
        swRight.position.set(-0.05, 0.92, -0.91);
        swRight.rotation.y = Math.PI;
        car.add(swRight);

        car.name = 'ModelA_Aero';
        return car;
    }

    // ========================================================================
    // MODEL B — "TERRA" SUV (BYD U8 Style)
    // ========================================================================

    function buildModelB(bodyColor) {
        bodyColor = bodyColor || 0x2255cc;
        var car = new THREE.Group();
        var bodyMat = createBodyMaterial(bodyColor);
        var glassMat = createGlassMaterial();
        var chromeMat = createChromeMaterial();
        var plasticMat = new THREE.MeshStandardMaterial({ color: 0x28282e, roughness: 0.9 });

        // === BODY ===
        var bodyGroup = new THREE.Group();
        bodyGroup.name = 'body';

        // Main boxy SUV lower body core
        var lowerGeo = new THREE.BoxGeometry(4.1, 0.72, 1.88);
        var lowerBody = new THREE.Mesh(lowerGeo, bodyMat);
        lowerBody.position.set(0, 0.82, 0);
        bodyGroup.add(lowerBody);

        // Upper cabin — boxy, tall offroader cabin
        var upperGeo = new THREE.BoxGeometry(2.55, 0.72, 1.84);
        var upperBody = new THREE.Mesh(upperGeo, bodyMat);
        upperBody.position.set(-0.15, 1.48, 0);
        bodyGroup.add(upperBody);

        // Contrasting grey off-road wheel arches / fender flares
        var archPositions = [
            { x: 1.25, z: 0.96 }, { x: 1.25, z: -0.96 },
            { x: -1.25, z: 0.96 }, { x: -1.25, z: -0.96 }
        ];
        for (var a = 0; a < archPositions.length; a++) {
            var flareGeo = new THREE.BoxGeometry(1.0, 0.28, 0.1);
            var flare = new THREE.Mesh(flareGeo, plasticMat);
            flare.position.set(archPositions[a].x, 0.75, archPositions[a].z);
            bodyGroup.add(flare);
        }

        // Side steps / running boards (chrome + black)
        var stepL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), chromeMat);
        stepL.position.set(0, 0.44, 0.98);
        bodyGroup.add(stepL);
        var stepR = stepL.clone();
        stepR.position.z = -0.98;
        bodyGroup.add(stepR);

        car.add(bodyGroup);

        // === HOOD ===
        var hoodGroup = new THREE.Group();
        hoodGroup.name = 'hood';
        var hoodGeo = new THREE.BoxGeometry(1.15, 0.08, 1.84);
        var hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(1.22, 1.16, 0);
        hoodGroup.add(hood);

        // Bold vertical matrix pattern front grille (BYD signature)
        var grilleGeo = new THREE.BoxGeometry(0.06, 0.52, 1.4);
        var grille = new THREE.Mesh(grilleGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.8, roughness: 0.2 }));
        grille.position.set(1.81, 0.78, 0);
        hoodGroup.add(grille);

        // Grid lines on the grille
        for (var gl = -2; gl <= 2; gl++) {
            var strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.48, 0.03), chromeMat);
            strip.position.set(1.83, 0.78, gl * 0.3);
            hoodGroup.add(strip);
        }
        
        car.add(hoodGroup);

        // === ROOF ===
        var roofGroup = new THREE.Group();
        roofGroup.name = 'roof';
        var roofGeo = new THREE.BoxGeometry(2.35, 0.06, 1.8);
        var roof = new THREE.Mesh(roofGeo, bodyMat);
        roof.position.set(-0.15, 1.84, 0);
        roofGroup.add(roof);

        // Heavy-duty metal roof rails
        var railLeft = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.04), chromeMat);
        railLeft.position.set(-0.15, 1.9, 0.86);
        roofGroup.add(railLeft);
        var railRight = railLeft.clone();
        railRight.position.z = -0.86;
        roofGroup.add(railRight);

        // Cross rails for roof rack
        for (var cr = -1; cr <= 1; cr++) {
            var crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.7), plasticMat);
            crossBar.position.set(-0.15 + cr * 0.6, 1.9, 0);
            roofGroup.add(crossBar);
        }
        car.add(roofGroup);

        // === DOORS ===
        var doorsGroup = new THREE.Group();
        doorsGroup.name = 'doors';
        var doorPositions = [
            { x: 0.42, z: 0.94 }, { x: -0.48, z: 0.94 },
            { x: 0.42, z: -0.94 }, { x: -0.48, z: -0.94 }
        ];
        for (var d = 0; d < doorPositions.length; d++) {
            var doorGeo = new THREE.BoxGeometry(0.9, 0.74, 0.03);
            var door = new THREE.Mesh(doorGeo, bodyMat);
            door.position.set(doorPositions[d].x, 0.94, doorPositions[d].z);
            doorsGroup.add(door);
            
            var handleGeo = new THREE.BoxGeometry(0.15, 0.035, 0.02);
            var handle = new THREE.Mesh(handleGeo, chromeMat);
            handle.position.set(doorPositions[d].x + 0.2, 1.02, doorPositions[d].z + (doorPositions[d].z > 0 ? 0.02 : -0.02));
            doorsGroup.add(handle);
        }
        car.add(doorsGroup);

        // === WINDSHIELD ===
        var windshieldGroup = new THREE.Group();
        windshieldGroup.name = 'windshield';
        var wsGeo = new THREE.PlaneGeometry(1.68, 0.68);
        var windshield = new THREE.Mesh(wsGeo, glassMat);
        windshield.position.set(0.9, 1.48, 0);
        windshield.rotation.z = -0.42;
        windshieldGroup.add(windshield);
        car.add(windshieldGroup);

        // === REAR WINDOW ===
        var rearWindowGroup = new THREE.Group();
        rearWindowGroup.name = 'rear_window';
        var rwGeo = new THREE.PlaneGeometry(1.58, 0.58);
        var rearWindow = new THREE.Mesh(rwGeo, glassMat);
        rearWindow.position.set(-1.32, 1.5, 0);
        rearWindow.rotation.z = 0.18;
        rearWindowGroup.add(rearWindow);
        car.add(rearWindowGroup);

        // === WHEELS ===
        var wheelsGroup = new THREE.Group();
        wheelsGroup.name = 'wheels';
        var wheelPositions = [
            { x: 1.25, y: 0.45, z: 0.98 },
            { x: 1.25, y: 0.45, z: -0.98 },
            { x: -1.25, y: 0.45, z: 0.98 },
            { x: -1.25, y: 0.45, z: -0.98 }
        ];
        for (var w = 0; w < wheelPositions.length; w++) {
            var wheel = createWheel(0.44, 0.28);
            wheel.position.set(wheelPositions[w].x, wheelPositions[w].y, wheelPositions[w].z);
            wheel.rotation.y = Math.PI / 2;
            wheelsGroup.add(wheel);
        }
        car.add(wheelsGroup);

        // === HEADLIGHTS ===
        var headlightsGroup = new THREE.Group();
        headlightsGroup.name = 'headlights';
        var hlLeft = createHeadlight('round');
        hlLeft.position.set(1.81, 1.04, 0.64);
        headlightsGroup.add(hlLeft);
        var hlRight = createHeadlight('round');
        hlRight.position.set(1.81, 1.04, -0.64);
        headlightsGroup.add(hlRight);
        car.add(headlightsGroup);

        // === TAILLIGHTS ===
        var taillightsGroup = new THREE.Group();
        taillightsGroup.name = 'taillights';
        var tlMat = createTaillightMaterial();
        var tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.12), tlMat);
        tlLeft.position.set(-2.03, 1.28, 0.78);
        taillightsGroup.add(tlLeft);
        var tlRight = tlLeft.clone();
        tlRight.position.z = -0.78;
        taillightsGroup.add(tlRight);
        car.add(taillightsGroup);

        // === BUMPERS ===
        var frontBumperGroup = new THREE.Group();
        frontBumperGroup.name = 'bumper_front';
        var fbGeo = new THREE.BoxGeometry(0.24, 0.38, 1.9);
        var fb = new THREE.Mesh(fbGeo, plasticMat);
        fb.position.set(1.82, 0.58, 0);
        frontBumperGroup.add(fb);
        
        var skidGeo = new THREE.BoxGeometry(0.35, 0.04, 0.85);
        var skid = new THREE.Mesh(skidGeo, chromeMat);
        skid.position.set(1.82, 0.38, 0);
        frontBumperGroup.add(skid);
        car.add(frontBumperGroup);

        var rearBumperGroup = new THREE.Group();
        rearBumperGroup.name = 'bumper_rear';
        var rbGeo = new THREE.BoxGeometry(0.16, 0.32, 1.88);
        var rb = new THREE.Mesh(rbGeo, plasticMat);
        rb.position.set(-2.02, 0.58, 0);
        rearBumperGroup.add(rb);
        
        var spareCoverGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 24);
        var spareCover = new THREE.Mesh(spareCoverGeo, bodyMat);
        spareCover.rotation.x = Math.PI / 2;
        spareCover.position.set(-2.06, 1.15, 0);
        
        // Add a glossy black center plate on the spare tire cover
        var centerPlateGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.23, 24);
        var centerPlateMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
        var centerPlate = new THREE.Mesh(centerPlateGeo, centerPlateMat);
        centerPlate.rotation.x = Math.PI / 2;
        centerPlate.position.set(-2.065, 1.15, 0);

        // Add a chrome brand badge in the center of the spare wheel
        var brandBadgeGeo = new THREE.TorusGeometry(0.08, 0.012, 8, 16);
        var brandBadge = new THREE.Mesh(brandBadgeGeo, chromeMat);
        brandBadge.position.set(-2.185, 1.15, 0);
        brandBadge.rotation.y = Math.PI / 2;
        
        var lockBand = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.23, 24, 1, true), chromeMat);
        lockBand.rotation.x = Math.PI / 2;
        lockBand.position.set(-2.06, 1.15, 0);
        
        rearBumperGroup.add(spareCover);
        rearBumperGroup.add(centerPlate);
        rearBumperGroup.add(brandBadge);
        rearBumperGroup.add(lockBand);
        car.add(rearBumperGroup);

        // === MIRRORS ===
        var mirrorsGroup = new THREE.Group();
        mirrorsGroup.name = 'mirrors';
        var mirrorGeo = new THREE.BoxGeometry(0.12, 0.08, 0.18);
        var mirrorLeft = new THREE.Mesh(mirrorGeo, bodyMat);
        mirrorLeft.position.set(0.72, 1.34, 1.04);
        mirrorsGroup.add(mirrorLeft);
        var mirrorRight = new THREE.Mesh(mirrorGeo.clone(), bodyMat);
        mirrorRight.position.set(0.72, 1.34, -1.04);
        mirrorsGroup.add(mirrorRight);
        car.add(mirrorsGroup);

        // === INTERIOR ===
        var interiorGroup = createInterior(1.5, 2.1, 0.65);
        interiorGroup.name = 'interior';
        car.add(interiorGroup);

        // Side windows
        var sideWindowGeo = new THREE.PlaneGeometry(1.72, 0.52);
        var swLeft = new THREE.Mesh(sideWindowGeo, glassMat);
        swLeft.position.set(-0.12, 1.38, 0.94);
        car.add(swLeft);
        var swRight = new THREE.Mesh(sideWindowGeo.clone(), glassMat);
        swRight.position.set(-0.12, 1.38, -0.94);
        swRight.rotation.y = Math.PI;
        car.add(swRight);

        car.name = 'ModelB_Terra';
        return car;
    }

    // ========================================================================
    // MODEL C — "FLUX" SPORTS CAR (Ferrari SF90 Style)
    // ========================================================================

    function buildModelC(bodyColor) {
        bodyColor = bodyColor || 0x2255cc;
        var car = new THREE.Group();
        var bodyMat = createBodyMaterial(bodyColor);
        var glassMat = createGlassMaterial();
        var chromeMat = createChromeMaterial();
        var carbonMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1f, roughness: 0.5, metalness: 0.8 });

        // === BODY ===
        var bodyGroup = new THREE.Group();
        bodyGroup.name = 'body';

        // Extreme low, wide chassis core
        var lowerGeo = new THREE.BoxGeometry(3.9, 0.28, 1.96);
        var lowerBody = new THREE.Mesh(lowerGeo, bodyMat);
        lowerBody.position.set(0, 0.38, 0);
        bodyGroup.add(lowerBody);

        // Low profile mid-engine cabin
        var upperGeo = new THREE.BoxGeometry(1.68, 0.35, 1.62);
        var upperBody = new THREE.Mesh(upperGeo, bodyMat);
        upperBody.position.set(-0.2, 0.69, 0);
        bodyGroup.add(upperBody);

        // F1 pointed nose cone wedge structure
        var noseGeo = new THREE.BoxGeometry(1.0, 0.16, 1.5);
        var nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.position.set(1.5, 0.34, 0);
        nose.rotation.z = 0.06;
        bodyGroup.add(nose);

        // Sculpted side cooling pods / air intakes
        var podL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.24, 0.18), bodyMat);
        podL.position.set(-0.25, 0.38, 0.98);
        bodyGroup.add(podL);
        var podR = podL.clone();
        podR.position.z = -0.98;
        bodyGroup.add(podR);
        
        // Carbon fiber side skirts with rear aerodynamic winglets
        var skirtL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.08), carbonMat);
        skirtL.position.set(0, 0.24, 0.98);
        bodyGroup.add(skirtL);
        
        var wingletLGeo = new THREE.BoxGeometry(0.15, 0.18, 0.02);
        var wingletL = new THREE.Mesh(wingletLGeo, carbonMat);
        wingletL.position.set(-1.0, 0.33, 1.01);
        wingletL.rotation.y = 0.1;
        bodyGroup.add(wingletL);

        var skirtR = skirtL.clone();
        skirtR.position.z = -0.98;
        bodyGroup.add(skirtR);

        var wingletR = wingletL.clone();
        wingletR.position.z = -1.01;
        wingletR.rotation.y = -0.1;
        bodyGroup.add(wingletR);

        // Muscular fender flares (front and back)
        var frontFlareL = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.1), bodyMat);
        frontFlareL.position.set(1.05, 0.44, 0.95);
        bodyGroup.add(frontFlareL);
        var frontFlareR = frontFlareL.clone();
        frontFlareR.position.z = -0.95;
        bodyGroup.add(frontFlareR);
        
        var rearFlareL = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.12), bodyMat);
        rearFlareL.position.set(-1.05, 0.46, 0.98);
        bodyGroup.add(rearFlareL);
        var rearFlareR = rearFlareL.clone();
        rearFlareR.position.z = -0.98;
        bodyGroup.add(rearFlareR);

        car.add(bodyGroup);

        // === HOOD ===
        var hoodGroup = new THREE.Group();
        hoodGroup.name = 'hood';
        var hoodGeo = new THREE.BoxGeometry(1.22, 0.04, 1.76);
        var hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.set(0.9, 0.52, 0);
        hood.rotation.z = 0.08;
        hoodGroup.add(hood);
        
        var scoopGeo = new THREE.BoxGeometry(0.38, 0.02, 0.5);
        var scoop = new THREE.Mesh(scoopGeo, carbonMat);
        scoop.position.set(0.7, 0.55, 0);
        scoop.rotation.z = 0.15;
        hoodGroup.add(scoop);
        
        car.add(hoodGroup);

        // === ROOF ===
        var roofGroup = new THREE.Group();
        roofGroup.name = 'roof';
        var roofGeo = new THREE.BoxGeometry(1.28, 0.04, 1.35);
        var roof = new THREE.Mesh(roofGeo, bodyMat);
        roof.position.set(-0.2, 0.86, 0);
        roofGroup.add(roof);
        car.add(roofGroup);

        // === REAR SPOILER ===
        var spoilerGroup = new THREE.Group();
        var spoilerGeo = new THREE.BoxGeometry(0.24, 0.03, 1.72);
        var spoiler = new THREE.Mesh(spoilerGeo, carbonMat);
        spoiler.position.set(-1.8, 0.78, 0);
        spoiler.rotation.z = 0.1;
        spoilerGroup.add(spoiler);
        
        var supL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), chromeMat);
        supL.position.set(-1.74, 0.65, 0.58);
        spoilerGroup.add(supL);
        var supR = supL.clone();
        supR.position.z = -0.58;
        spoilerGroup.add(supR);
        car.add(spoilerGroup);

        // === DOORS ===
        var doorsGroup = new THREE.Group();
        doorsGroup.name = 'doors';
        var doorPositions = [
            { x: 0.12, z: 0.94 },
            { x: 0.12, z: -0.94 }
        ];
        for (var d = 0; d < doorPositions.length; d++) {
            var doorGeo = new THREE.BoxGeometry(1.0, 0.38, 0.03);
            var door = new THREE.Mesh(doorGeo, bodyMat);
            door.position.set(doorPositions[d].x, 0.5, doorPositions[d].z);
            doorsGroup.add(door);
            
            var handleGeo = new THREE.BoxGeometry(0.12, 0.015, 0.01);
            var handle = new THREE.Mesh(handleGeo, carbonMat);
            handle.position.set(doorPositions[d].x + 0.28, 0.55, doorPositions[d].z + (doorPositions[d].z > 0 ? 0.015 : -0.015));
            doorsGroup.add(handle);
        }
        car.add(doorsGroup);

        // === WINDSHIELD ===
        var windshieldGroup = new THREE.Group();
        windshieldGroup.name = 'windshield';
        var wsGeo = new THREE.PlaneGeometry(1.42, 0.48);
        var windshield = new THREE.Mesh(wsGeo, glassMat);
        windshield.position.set(0.6, 0.76, 0);
        windshield.rotation.z = -0.62;
        windshieldGroup.add(windshield);
        car.add(windshieldGroup);

        // === REAR WINDOW ===
        var rearWindowGroup = new THREE.Group();
        rearWindowGroup.name = 'rear_window';
        var rwGeo = new THREE.PlaneGeometry(1.22, 0.65);
        var rearWindow = new THREE.Mesh(rwGeo, glassMat);
        rearWindow.position.set(-0.95, 0.74, 0);
        rearWindow.rotation.z = 0.44;
        rearWindowGroup.add(rearWindow);
        car.add(rearWindowGroup);

        // === WHEELS ===
        var wheelsGroup = new THREE.Group();
        wheelsGroup.name = 'wheels';
        var wheelPositions = [
            { x: 1.15, y: 0.32, z: 0.98 },
            { x: 1.15, y: 0.32, z: -0.98 },
            { x: -1.15, y: 0.34, z: 1.0 },
            { x: -1.15, y: 0.34, z: -1.0 }
        ];
        for (var w = 0; w < wheelPositions.length; w++) {
            var isRear = w >= 2;
            var wheel = createWheel(isRear ? 0.36 : 0.32, isRear ? 0.28 : 0.24);
            wheel.position.set(wheelPositions[w].x, wheelPositions[w].y, wheelPositions[w].z);
            wheel.rotation.y = Math.PI / 2;
            wheelsGroup.add(wheel);
        }
        car.add(wheelsGroup);

        // === HEADLIGHTS ===
        var headlightsGroup = new THREE.Group();
        headlightsGroup.name = 'headlights';
        var hlLeft = createHeadlight('angular');
        hlLeft.position.set(1.92, 0.44, 0.58);
        headlightsGroup.add(hlLeft);
        var hlRight = createHeadlight('angular');
        hlRight.position.set(1.92, 0.44, -0.58);
        headlightsGroup.add(hlRight);
        car.add(headlightsGroup);

        // === TAILLIGHTS ===
        var taillightsGroup = new THREE.Group();
        taillightsGroup.name = 'taillights';
        var tlMat = createTaillightMaterial();
        for (var side = -1; side <= 1; side += 2) {
            for (var ring = 0; ring < 2; ring++) {
                var tlRingGeo = new THREE.BoxGeometry(0.04, 0.05, 0.12);
                var tlRing = new THREE.Mesh(tlRingGeo, tlMat);
                tlRing.position.set(-1.88, 0.52, side * (0.46 + ring * 0.16));
                taillightsGroup.add(tlRing);
            }
        }
        car.add(taillightsGroup);

        // === BUMPERS ===
        var frontBumperGroup = new THREE.Group();
        frontBumperGroup.name = 'bumper_front';
        var fbGeo = new THREE.BoxGeometry(0.12, 0.18, 1.88);
        var fb = new THREE.Mesh(fbGeo, bodyMat);
        fb.position.set(1.88, 0.3, 0);
        frontBumperGroup.add(fb);
        
        var splitterGeo = new THREE.BoxGeometry(0.35, 0.03, 1.94);
        var splitter = new THREE.Mesh(splitterGeo, carbonMat);
        splitter.position.set(1.92, 0.22, 0);
        frontBumperGroup.add(splitter);
        car.add(frontBumperGroup);

        var rearBumperGroup = new THREE.Group();
        rearBumperGroup.name = 'bumper_rear';
        var rbGeo = new THREE.BoxGeometry(0.12, 0.18, 1.84);
        var rb = new THREE.Mesh(rbGeo, bodyMat);
        rb.position.set(-1.88, 0.38, 0);
        rearBumperGroup.add(rb);
        
        var diffGeo = new THREE.BoxGeometry(0.25, 0.06, 1.5);
        var diffuser = new THREE.Mesh(diffGeo, carbonMat);
        diffuser.position.set(-1.9, 0.25, 0);
        rearBumperGroup.add(diffuser);
        
        for (var f = -3; f <= 3; f++) {
            if (f === 0) continue;
            var fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.02), carbonMat);
            fin.position.set(-1.9, 0.22, f * 0.18);
            rearBumperGroup.add(fin);
        }
        car.add(rearBumperGroup);

        // === MIRRORS ===
        var mirrorsGroup = new THREE.Group();
        mirrorsGroup.name = 'mirrors';
        var mirrorGeo = new THREE.BoxGeometry(0.08, 0.04, 0.12);
        var mirrorLeft = new THREE.Mesh(mirrorGeo, bodyMat);
        mirrorLeft.position.set(0.48, 0.65, 0.94);
        mirrorsGroup.add(mirrorLeft);
        var mirrorRight = new THREE.Mesh(mirrorGeo.clone(), bodyMat);
        mirrorRight.position.set(0.48, 0.65, -0.94);
        mirrorsGroup.add(mirrorRight);
        car.add(mirrorsGroup);

        // === INTERIOR ===
        var interiorGroup = createInterior(1.3, 1.5, 0.32);
        interiorGroup.name = 'interior';
        car.add(interiorGroup);

        // Side windows
        var sideWindowGeo = new THREE.PlaneGeometry(1.05, 0.26);
        var swLeft = new THREE.Mesh(sideWindowGeo, glassMat);
        swLeft.position.set(-0.06, 0.68, 0.91);
        car.add(swLeft);
        var swRight = new THREE.Mesh(sideWindowGeo.clone(), glassMat);
        swRight.position.set(-0.06, 0.68, -0.91);
        swRight.rotation.y = Math.PI;
        car.add(swRight);

        car.name = 'ModelC_Flux';
        return car;
    }

    // ========================================================================
    // PUBLIC API — EVModelBuilder
    // ========================================================================

    /**
     * EVModelBuilder — Factory class for creating procedural EV models.
     * All build methods return a THREE.Group with named children for raycasting.
     */
    var EVModelBuilder = {
        /**
         * Build Model A "Aero" — Sleek sedan
         * @param {number} [color=0x2255cc] - Body color hex
         * @returns {THREE.Group}
         */
        buildModelA: function (color) {
            return buildModelA(color);
        },

        /**
         * Build Model B "Terra" — Rugged SUV
         * @param {number} [color=0x2255cc] - Body color hex
         * @returns {THREE.Group}
         */
        buildModelB: function (color) {
            return buildModelB(color);
        },

        /**
         * Build Model C "Flux" — Aggressive sports car
         * @param {number} [color=0x2255cc] - Body color hex
         * @returns {THREE.Group}
         */
        buildModelC: function (color) {
            return buildModelC(color);
        },

        /**
         * Get a model by name string.
         * @param {string} modelName - "A", "B", or "C"
         * @param {number} [color=0x2255cc] - Body color hex
         * @returns {THREE.Group}
         */
        build: function (modelName, color) {
            switch (modelName.toUpperCase()) {
                case 'A': return this.buildModelA(color);
                case 'B': return this.buildModelB(color);
                case 'C': return this.buildModelC(color);
                default:
                    console.warn('EVModelBuilder: Unknown model "' + modelName + '", defaulting to A');
                    return this.buildModelA(color);
            }
        },

        /**
         * Change the body color of an existing model.
         * Traverses all named "body", "hood", "roof", "doors", "bumper_*", "mirrors" groups
         * and updates their materials.
         * @param {THREE.Group} carGroup - The car model group
         * @param {number} newColor - New hex color
         */
        setBodyColor: function (carGroup, newColor) {
            var colorObj = new THREE.Color(newColor);
            var bodyParts = ['body', 'hood', 'roof', 'doors', 'bumper_front', 'bumper_rear', 'mirrors'];

            for (var i = 0; i < bodyParts.length; i++) {
                var partName = bodyParts[i];
                var part = carGroup.getObjectByName(partName);
                if (part) {
                    part.traverse(function (child) {
                        if (child.isMesh && child.material && child.material.clearcoat !== undefined) {
                            child.material.color.copy(colorObj);
                            child.material.needsUpdate = true;
                        }
                    });
                }
            }
        }
    };

    // Expose globally
    window.EVModelBuilder = EVModelBuilder;

})();
