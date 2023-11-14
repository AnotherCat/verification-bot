import { Button } from "../types";
import followupLogic from "./shared-followup";


const button: Button = {
    customIdLabel: 'followup',
    execute: followupLogic
};
module.exports = button