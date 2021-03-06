import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {GadgetInstanceService} from '../../board/grid/grid.service';
import {RuntimeService} from '../../services/runtime.service';
import {GadgetPropertyService} from '../_common/gadget-property.service';
import {EndPointService} from '../../configuration/tab-endpoint/endpoint.service';
import {GadgetBase} from '../_common/gadget-base';
import {isUndefined} from 'util';
import {StompWebSocket} from './stompws';
import {Observable} from 'rxjs/Observable';

@Component({
    selector: 'app-dynamic-component',
    moduleId: module.id,
    templateUrl: './view.html',
    styleUrls: ['../_common/styles-gadget.css']
})

export class CPUMGadgetComponent extends GadgetBase implements OnDestroy, OnInit {

    // chart options
    showXAxis = true;
    showYAxis = true;
    gradient = true;
    showLegend = false;
    showXAxisLabel = true;
    showYAxisLabel = false;
    yAxisLabel = 'Available CPUs';
    xAxisLabel = 'Percent Utilization';
    view: any[];
    single: any[] = [];
    colorScheme: any = {
        domain: ['#0AFF16', '#0d5481']
    };
    socket: any;

    constructor(protected _runtimeService: RuntimeService,
                protected _gadgetInstanceService: GadgetInstanceService,
                protected _propertyService: GadgetPropertyService,
                protected _endPointService: EndPointService,
                private _changeDetectionRef: ChangeDetectorRef) {
        super(_runtimeService,
            _gadgetInstanceService,
            _propertyService,
            _endPointService,
            _changeDetectionRef);
    }

    public preRun(): void {
    }

    public run() {

        this.errorExists = false;
        this.actionInitiated = true;

        this.socket = new StompWebSocket('http://localhost:8080/cpu_monitor_websocket', '/topic/cpu-metrics', '/app/collect');

        const timer = Observable.timer(5000);
        timer.subscribe(t => {
            if (this.socket.isInitialized()) {
                this.socket.send({'requestParam': 'start'});

                this.socket.getSubject().subscribe(data => {

                    this.updateGraph(data.cpu_utilization);

                });

                this.inRun = true;
                this.actionInitiated = false;

            } else {
                // delay and wait a few more times
            }
        });
    }

    public stop() {
        this.errorExists = false;
        this.inRun = false;
        this.actionInitiated = true;

        this.socket.send({'requestParam': 'stop'});
        this.actionInitiated = false;

    }

    public updateGraph(value: number) {

        const series: any[] = [];
        const single: any = [];
        series.push({
            'name': 'used',
            'value': value
        });
        series.push({
            'name': 'available',
            'value': 100 - value
        });

        single.push({
            'name': 'CPU',
            'series': series
        });

        Object.assign(this, {single});

    }

    public updateData(data: any[]) {

    }

    public updateProperties(updatedProperties: any) {

        /**
         * todo
         *  A similar operation exists on the procmman-config-service
         *  whenever the property page form is saved, the in memory board model
         *  is updated as well as the gadget instance properties
         *  which is what the code below does. This can be eliminated with code added to the
         *  config service or the property page service.
         *
         * **/

        const updatedPropsObject = JSON.parse(updatedProperties);

        this.propertyPages.forEach(function (propertyPage) {


            for (let x = 0; x < propertyPage.properties.length; x++) {

                for (const prop in updatedPropsObject) {
                    if (updatedPropsObject.hasOwnProperty(prop)) {
                        if (prop === propertyPage.properties[x].key) {
                            propertyPage.properties[x].value = updatedPropsObject[prop];
                        }

                    }
                }
            }
        });

        this.title = updatedPropsObject.title;
        this.showXAxis = updatedPropsObject.chart_properties;
        this.showYAxis = updatedPropsObject.chart_properties;
        this.gradient = updatedPropsObject.chart_properties;
        this.showLegend = updatedPropsObject.chart_properties;
        this.showXAxisLabel = updatedPropsObject.chart_properties;
        this.showYAxisLabel = updatedPropsObject.chart_properties;

        this.setEndPoint(updatedPropsObject.endpoint);

        this.showOperationControls = true;

    }

    public ngOnDestroy() {

        this.stop();

    }

}
