import { Complex, constrainMap } from "../utils/math.js";
import * as d3 from "../utils/color.js";
import { WaveFunction } from "./psi.js";
import { State } from "../dynamical_system/dynamic.js";

let psi;
let states = [];
let pretime, time_scale = 1;

function getColor(pos, t) {
    const p = psi.psi(pos, t);
    const prob = 1000 * p.absSq();
    const phase = p.theta;
    const brightness = Math.pow(prob / (prob + 1), 0.1);
    return d3.hcl(
        constrainMap(phase, -Math.PI, +Math.PI, 0, 360),
        constrainMap(brightness, 0, 1, 0, 100),
        constrainMap(brightness, 0, 1, 0, 100),
    ).formatHex();
}
self.addEventListener("message", function (e) {
    const response = {};
    if (e.data.superposition) {
        psi = WaveFunction.superposition(e.data.superposition.map(({ coeff: { re, im }, quantum_number: { n, l, m } }) => {
            return {
                coeff: Complex.fromCartesian(re ?? 0, im ?? 0),
                psi: WaveFunction.fromOrbital(n, l, m),
            };
        }));
    }
    if (e.data.addStates)
        states.push(...psi.sample(e.data.addStates).map(pos => new State(pos)));
    if (e.data.resetState)
        states = [];
    if (e.data.time && pretime) {
        const deltaTime = (e.data.time - pretime) * time_scale;
        const subdivide = Math.ceil(deltaTime / (time_scale * 10)); // 60 fps
        const stepTime = deltaTime / subdivide;
        for (let i = 0; i < subdivide; i++) {
            const time = pretime * time_scale + (i + 0.5) * stepTime;
            states.forEach((state) => {
                state.update((t, [pos]) => psi.getVel(pos, t), time, stepTime);
            });
        }
    }
    if (e.data.time_scale) time_scale = e.data.time_scale;
    if (e.data.time) pretime = e.data.time;
    if (states) response.states = states.map(state => ({
        x: state.state[0].x,
        y: state.state[0].y,
        z: state.state[0].z,
        c: getColor(state.state[0], pretime)
    }));
    this.postMessage(response);
});