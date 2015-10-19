'use strict';

const EventEmitter = require('events').EventEmitter;
const _ = require('lodash');

class ConsortiumWatcher extends EventEmitter {

    /**
     * constructor
     * @param  {pouchy} pouchDb pouchy-wrapped pouchdb-instance
     * @return {ConsortiumWatcher}         event emitter for the pouchdb
     */
    constructor(pouchDb) {
        this.db = pouchDb;
        this.watchDb();
    }

    /**
     * Watch this db: should only be called by contsructor after setting this.db
     * @return {null}
     */
    watchDb() {
        this.db.changes({
            live: true,
            since: 'now',
            /*jscs:disable*/
            include_docs: true //jshint ignore:line
            /*jscs:enable*/
        }).on(
            'change',
            _.bind(this.handleDocChange, this)
        );
    }

    /**
     * handle individual changes to DB
     * always emits a `changed` event
     * emits a `changed:aggregate` event if doc is an aggregate
     * emits a `changed:analysis` event if doc is an analysis
     * @param  {object} newDoc the new/changed document
     * @return {null}
     */
    handleDocChange(newDoc) {
        this.emit('changed', newDoc);
        if (newDoc.aggregate === true) {
            this.emit('change:aggregate', newDoc);
        } else {
            this.emit('change:analysis', newDoc);
        }
    }

    /**
     * generic error emitter
     * @param  {string} location an identifier for where the error was caught
     * @param  {Error} error     the error object
     * @return {null}
     */
    emitError(location, error) {
        this.emit('error', {
            message: `Uncaught error in '${location}'`,
            error: error
        });
    }

    /**
     *
     */
     handleAggregateChange(newDoc) {
         const contributorCount = newDoc.contributors.length;
         const missingAnalysisCount = newDoc.clientCount - contributorCount;
         if (missingAnalysisCount === 0) {
             this.emit('allAnalysesSubmitted');
         } else {
             this.emit('waitingOnAnalyses', {count: missingAnalysisCount});
         }
     }
}

module.exports = ConsortiumWatcher;
