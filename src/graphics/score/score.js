import * as utils from "../../utils.js";

import {Barline} from "./barline";
import {Measure} from "./measure";
import {Staff} from "./staff";
import {System} from "./system";
import {ScoreContext} from "./basescore.js";

class Score {
    constructor(domElem, params = {}) {
        this.context = new ScoreContext(domElem);

        this.staff_count = params.staffs || 1;
        this.system_count = 0;

        utils.assert(this.staff_count > 0 && this.staff_count < 13, "Number of staffs must be in the range [1, 12]");

        this.systems = [];

        if (params.systems) {
            utils.assert(params.systems > 0 && params.systems < 13, "Number of systems must be in the range [1, 12]");

            for (let i = 0; i < params.systems; i++) {
                this.addSystem();
            }
        }
    }

    addSystem() {
        let system = new System(this.context, {
            staff_count: this.staff_count
        });

        system.spacing_y = 75;

        this.systems.push(system);
        this.system_count++;

        this.spaceSystems();
    }

    spaceSystems() {
        let offset_y = 20;

        for (let i = 0; i < this.systems.length; i++) {
            let system = this.systems[i];

            system.offset_y = offset_y;
            system.recalculate();

            offset_y += system.height + system.spacing_y;
        }
    }

    system(index) {
        return this.systems[index];
    }

    recalculate() {
        this.spaceSystems();
    }
}

export {Score};