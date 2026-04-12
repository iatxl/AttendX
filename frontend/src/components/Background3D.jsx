import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';

const Stars = (props) => {
    const ref = useRef();
    const sphere = useMemo(() => {
        const positions = new Float32Array(5000 * 3);
        const radius = 1.5;
        for (let i = 0; i < positions.length; i += 3) {
            // Generate a random point in a sphere manually
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * radius;

            const sinPhi = Math.sin(phi);
            positions[i] = r * sinPhi * Math.cos(theta);     // x
            positions[i + 1] = r * sinPhi * Math.sin(theta); // y
            positions[i + 2] = r * Math.cos(phi);            // z
        }
        return positions;
    }, []);

    useFrame((state, delta) => {
        ref.current.rotation.x -= delta / 10;
        ref.current.rotation.y -= delta / 15;
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
                <PointMaterial
                    transparent
                    color="#f272c8"
                    size={0.002}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </Points>
        </group>
    );
};

const Background3D = () => {
    return (
        <div className="fixed inset-0 z-[-1] bg-black">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <Stars />
            </Canvas>
        </div>
    );
};

export default Background3D;
