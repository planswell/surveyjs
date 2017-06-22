import * as React from 'react';
import QuestionDateModel from "../question_date";
import {ReactQuestionFactory} from "../../react/reactquestionfactory";
import DatePicker from 'react-datepicker';
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
    handleOnChange(date) {
        this.question.value = date.format("MM/DD/YYYY");
        this.setState({ value: this.question.value });
    }
    componentWillReceiveProps(nextProps: any) {
        this.question = nextProps.question;
        this.css = nextProps.css;
    }
    render(): JSX.Element {
        if (!this.question) return null;
        var date = this.question.value ? moment(this.question.value) : moment();
        return (
            <div id={this.getDivId()}>
                <DatePicker className="form-control" showYearDropdown selected={date} onChange={this.handleOnChange} />
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
