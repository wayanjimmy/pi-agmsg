#!/usr/bin/env bash
# Pi currently checks its inbox explicitly; do not write another agent's hooks.
agmsg_delivery_apply() { :; }
agmsg_delivery_status() { echo 'mode: off'; }
agmsg_delivery_on_disable() { :; }
