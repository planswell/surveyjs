import * as React from 'react';
import QuestionDateModel from "../question_date";
import {ReactQuestionFactory} from "../../react/reactquestionfactory";
import Cleave from 'cleave.js/react';
import moment from 'moment';

export default class SurveyQuestionDate extends React.Component<any, any> {
    private question: QuestionDateModel;
    protected css: any;
    constructor(props: any) {
        super(props);
        this.question = props.question;
        this.css = props.css;
        this.state = { value: this.question.value };
        this.handleOnChange = this.handleOnChange.bind(this);
    }
    handleOnChange(event) {
        this.question.value = event.target.value;
        this.setState({ value: this.question.value });
    }
    componentWillReceiveProps(nextProps: any) {
        this.question = nextProps.question;
        this.css = nextProps.css;
    }
    render(): JSX.Element {
        if (!this.question) return null;
        var value = this.question.value;
        return (
            <div id={this.getDivId()}>
                <Cleave placeholder="DD/MM/YYYY"
                className="form-control"
                value={value}
                options={{date: true, datePattern: ['d', 'm', 'Y']}}
                onChange={this.handleOnChange} />
            </div>
        );
    }
    private getDateId(): string { return "date_" + this.question.id; }
    private getDivId(): string { return "rootDate_" + this.question.id; }
}

//Tell json serializer to create exactly this class. Override it from the model that doesn't have any rendering functionality.
ReactQuestionFactory.Instance.registerQuestion("date", (props) => {
    return React.createElement(SurveyQuestionDate, props);
});
