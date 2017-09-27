﻿import {JsonObject} from "./jsonobject";
import {Base, ISurvey, SurveyElement, ISurveyData, ISurveyImpl, ITextProcessor, HashTable, IQuestion, IPanel, IElement, IConditionRunner, IPage, SurveyError, Event} from "./base";
import {ISurveyTriggerOwner, SurveyTrigger} from "./trigger";
import {PageModel} from "./page";
import {TextPreProcessor} from "./textPreProcessor";
import {ProcessValue} from "./conditionProcessValue";
import {dxSurveyService} from "./dxSurveyService";
import {JsonError} from "./jsonobject";
import {surveyLocalization} from "./surveyStrings";
import {QuestionBase} from "./questionbase";
import {CustomError} from "./error";
import {ILocalizableOwner, LocalizableString} from "./localizablestring";

/**
 * Survey object contains information about the survey. Pages, Questions, flow logic and etc.
 */
export class SurveyModel extends Base implements ISurvey, ISurveyData, ISurveyImpl, ISurveyTriggerOwner, ILocalizableOwner {
    /**
     * You may show comments input for the most of questions. The entered text in the comment input will be saved as 'question name' + 'commentPrefix'.
     * @see data
     */
    public get commentPrefix(): string { return  Base.commentPrefix; }
    public set commentPrefix(val: string) {Base.commentPrefix = val; }
   
    private pagesValue: Array<PageModel>;
    private triggersValue: Array<SurveyTrigger>;
    private currentPageValue: PageModel = null;
    private valuesHash: HashTable<any> = {};
    private variablesHash: HashTable<any> = {};

    private localeValue: string = "";
    
    private isCompleted: boolean = false;
    private isCompletedBefore: boolean = false;
    private isLoading: boolean = false;
    private processedTextValues: HashTable<any> = {};
    private textPreProcessor: TextPreProcessor;
    private completedStateValue: string = "";
    private completedStateTextValue: string = "";
    /**
     * The event is fired after a user click on 'Complete' button and finished the survey. You may use it to send the data to your web server.
     * <br/> sender the survey object that fires the event
     * <br/> options.showDataSaving(text) call this method to show that the survey is saving the data on your server. The text is an optional parameter to show your message instead of default.
     * <br/> options.showDataSavingError(text) call this method to show that there is an error on saving the data on your server. If you want to show a custom error, use an optional text parameter.
     * <br/> options.showDataSavingSuccess(text) call this method to show that the data were successful saved on the server. 
     * <br/> options.showDataSavingClear call this method to hide the text about the saving progress.
     * @see data
     * @see clearInvisibleValues
     * @see completeLastPage
     * @see surveyPostId
     */
    public onComplete: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on clicking 'Next' page if sendResultOnPageNext is set to true. You may use it to save the intermidiate results, for example, if your survey is large enough.
     * <br/> sender the survey object that fires the event
     * @see sendResultOnPageNext
     */
    public onPartialSend: Event<(sender: SurveyModel) => any, any> = new Event<(sender: SurveyModel) => any, any>();
    /**
     * The event is fired when another page becomes the current. Typically it happens when a user click on 'Next' or 'Prev' buttons.
     * <br/> sender the survey object that fires the event
     * <br/> option.oldCurrentPage the previous current/active page
     * <br/> option.newCurrentPage a new current/active page
     * @see currentPage
     * @see currentPageNo
     * @see nextPage
     * @see prevPage
     * @see completeLastPage
     */
    public onCurrentPageChanged: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired when the question value is changed. It can be done via UI by a user or programmatically on calling setValue method.
     * <br/> sender the survey object that fires the event
     * <br/> options.name the value name that has been changed
     * <br/> options.question a question which question.name equals to the value name. If there are several questions with the same name, the first question is taken. If there is no such questions, the options.question is null.
     * <br/> options.value a new value
     * @see setValue
     */
    public onValueChanged: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on changing a question visibility.
     * <br/> sender the survey object that fires the event
     * <br/> options.question a question which visibility has been changed
     * <br/> options.name a question name
     * <br/> options.visible a question visible boolean value
     * @see QuestionBase.visibile
     * @see QuestionBase.visibileIf
     */
    public onVisibleChanged: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on changing a page visibility.
     * <br/> sender the survey object that fires the event
     * <br/> options.page a page  which visibility has been changed
     * <br/> options.visible a page visible boolean value
     * @see PageModel.visibile
     * @see PageModel.visibileIf
     */
    public onPageVisibleChanged: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on changing a panel visibility.
     * <br/> sender the survey object that fires the event
     * <br/> options.panel a panel which visibility has been changed
     * <br/> options.visible a panel visible boolean value
     * @see PanelModel.visibile
     * @see PanelModel.visibileIf
     */
    public onPanelVisibleChanged: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on adding a new question into survey.
     * 'question': question, 'name': question.name, 'index': index, 'parentPanel': parentPanel, 'rootPanel': rootPanel
     * <br/> sender the survey object that fires the event
     * <br/> options.question a newly added question object.
     * <br/> options.name a question name
     * <br/> options.index a index of the question in the container (page or panel)
     * <br/> options.parentPanel a container where question is located. It can be page or panel.
     * <br/> options.rootPanel typically it is a page.
     * @see QuestionBase
     */
    public onQuestionAdded: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on removing a question from survey
     * <br/> sender the survey object that fires the event
     * <br/> options.question a removed question object.
     * <br/> options.name a question name
     * @see QuestionBase
     */
    public onQuestionRemoved: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on adding a panel into survey
     * <br/> sender the survey object that fires the event
     * <br/> options.panel a newly added panel object.
     * <br/> options.name a panel name
     * <br/> options.index a index of the panel in the container (page or panel)
     * <br/> options.parentPanel a container where question is located. It can be page or panel.
     * <br/> options.rootPanel typically it is a page.
     * @see PanelModel
     */
    public onPanelAdded: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on removing a panel from survey
     * <br/> sender the survey object that fires the event
     * <br/> options.panel a removed panel object.
     * <br/> options.name a panel name
     * @see PanelModel
     */
    public onPanelRemoved: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on validating value in a question. Set your error to options.error and survey will show the error for the question and block completing the survey or going to the next page.
     * <br/> sender the survey object that fires the event
     * <br/> options.name a question name
     * <br/> options.value the current question value
     * <br/> options.error an error string. It is empty by default.
     * @see onServerValidateQuestions
     */
    public onValidateQuestion: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * Use this event to validate data on your server.
     * <br/> sender the survey object that fires the event
     * <br/> options.data the values of all non-empty questions on the current page. You can get a question value as options.data["myQuestionName"].
     * <br/> options.errors set your errors to this object as: options.errors["myQuestionName"] = "Error text";. It will be shown as a question error.
     * @see onValidateQuestion
     */
    public onServerValidateQuestions: (sender: SurveyModel, options: any) => any;
    /**
     * Use this event to modify the html before rendering, for example html on 'Thank you' page. Options has one parameter: options.html.
     * <br/> sender the survey object that fires the event
     * <br/> options.html an html that you may change before text processing and then rendering.
     * @see completedHtml
     * @see loadingHtml
     * @see QuestionHtmlModel.html
     */
    public onProcessHtml: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * Use this event to process the markdown text. 
     * <br/> sender the survey object that fires the event
     * <br/> options.text a text that is going to be rendered
     * <br/> options.html a html. It is null by default. Set it and survey will use it instead of options.text
     */
    public onTextMarkdown: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event fires when it get response from the [dxsurvey.com](http://www.dxsurvey.com) service on saving survey results. Use it to find out if the results have been saved successful.
     * <br/> sender the survey object that fires the event
     * <br/> options.success it is true if the results were sent to the service successful
     * <br/> options.response a response from the service
     */
    public onSendResult: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * Use it to get results after calling the getResult method. It returns a simple analytic from [dxsurvey.com](http://www.dxsurvey.com) service.
     * <br/> sender the survey object that fires the event
     * <br/> options.success it is true if the results were got from the service successful
     * <br/> options.data the object {AnswersCount, QuestionResult : {} }. AnswersCount is the number of posted survey results. QuestionResult is an object with all possible unique answers to the question and number of these answers.
     * <br/> options.dataList an array of objects {name, value}, where 'name' is an unique value/answer to the question and value is a number/count of such answers.
     * <br/> options.response the server response 
     * @see getResult
     */
    public onGetResult: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on uploading the file in QuestionFile. You may use it to change the file name or tells the library do not accept the file. There are three properties in options: options.name, options.file and options.accept.
     * <br/> sender the survey object that fires the event
     * name: name, file: file, accept: accept
     * <br/> name the file name
     * <br/> file the Javascript File object
     * <br/> accept a boolean value, true by default. Set it to false to deny this file to upload
     * @see uploadFile
     */
    public onUploadFile: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired before rendering a question. Use it to override the default question css classes. 
     * There are two parameters in options: options.question and options.cssClasses
     * <br/> sender the survey object that fires the event
     * <br/> options.question a question for which you may change the css classes
     * <br/> options.cssClasses an object with css classes. For example {root: "table", button: "button"}. You may change them to your own css classes.
     */
    public onUpdateQuestionCssClasses: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired right after survey is rendered in DOM. options.htmlElement is the root element.
     * <br/> sender the survey object that fires the event
     * <br/> options.htmlElement a root html element binded with the survey object
     */
    public onAfterRenderSurvey: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired right after a page is rendred in DOM. Use it to modify html elements. There are two parameters in options: options.currentPage, options.htmlElement
     * <br/> sender the survey object that fires the event
     * <br/> options.page a page object for which the event is fired. Typically the current/active page.
     * <br/> options.htmlElement an html element binded with the page object
     */
    public onAfterRenderPage: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired right after a question is rendred in DOM. Use it to modify html elements. There are two parameters in options: options.question, options.htmlElement
     * <br/> sender the survey object that fires the event
     * <br/> options.question a question object for which the event is fired
     * <br/> options.htmlElement an html element binded with the question object
     */
    public onAfterRenderQuestion: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired right after a panel is rendred in DOM. Use it to modify html elements. There are two parameters in options: options.panel, options.htmlElement
     * <br/> sender the survey object that fires the event
     * <br/> options.panel a panel object for which the event is fired
     * <br/> options.htmlElement an html element binded with the panel object
     */
    public onAfterRenderPanel: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on adding a new row in Matrix Dynamic quesiton. 
     * <br/> sender the survey object that fires the event
     * <br/> options.question a matrix question.
     * @see QuestionMatrixDynamicModel
     * @see QuestionMatrixDynamicModel.visibleRows
     */
    public onMatrixRowAdded: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired on adding a new row in Matrix Dynamic quesiton. 
     * <br/> sender the survey object that fires the event
     * <br/> options.question a matrix question.
     * <br/> options.rowIndex a removed row index.
     * <br/> options.row a removed row object.
     * @see QuestionMatrixDynamicModel
     * @see QuestionMatrixDynamicModel.visibleRows
     */
    public onMatrixRowRemoved: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired for every cell created in Matrix Dymic and Matrix Dropdown questions.
     * <br/> options.question - the matrix question
     * <br/> options.cell - the matrix cell
     * <br/> options.cellQuestion - the question/editor in the cell. You may customize it, change it's properties, like choices or visible.
     * <br/> options.rowValue - the value of the current row. To access the value of paticular column use: options.rowValue["columnValue"]
     * <br/> options.column - the matrix column object
     * <br/> options.columName - the matrix column name
     * <br/> options.row - the matrix row object
     * @see onMatrixRowAdded
     * @see QuestionMatrixDynamicModel
     * @see QuestionMatrixDropdownModel
     */
    public onMatrixCellCreated: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired when cell value is changed in Matrix Dymic and Matrix Dropdown questions.
     * <br/> options.question - the matrix question
     * <br/> options.columName - the matrix column name
     * <br/> options.value - a new value
     * <br/> options.row - the matrix row object
     * <br/> options.getCellQuestion(columnName) - the function that returns the cell question by column name.
     * @see onMatrixRowAdded
     * @see QuestionMatrixDynamicModel
     * @see QuestionMatrixDropdownModel
     */
    public onMatrixCellValueChanged: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The event is fired when Matrix Dymic and Matrix Dropdown questions validate the cell value.
     * <br/> options.question - the matrix question
     * <br/> options.columName - the matrix column name
     * <br/> options.value - a cell value
     * <br/> options.row - the matrix row object
     * <br/> options.getCellQuestion(columnName) - the function that returns the cell question by column name.
     * @see onMatrixRowAdded
     * @see QuestionMatrixDynamicModel
     * @see QuestionMatrixDropdownModel
     */
    public onMatrixCellValidate: Event<(sender: SurveyModel, options: any) => any, any> = new Event<(sender: SurveyModel, options: any) => any, any>();
    /**
     * The list of errors on loading survey json. If the list is empty after loading a json then the json is correct and there is no errors in it.
     * @see JsonError
     */
    public jsonErrors: Array<JsonError> = null;

    constructor(jsonObj: any = null) {
        super();
        var self = this;
        var locTitleValue = this.createLocalizableString("title", this, true);
        locTitleValue.onRenderedHtmlCallback = function(text) { return self.processedTitle; };
        this.createLocalizableString("completedHtml", this);
        this.createLocalizableString("completedBeforeHtml", this);
        this.createLocalizableString("loadingHtml", this);
        this.createLocalizableString("pagePrev", this);
        this.createLocalizableString("pageNext", this);
        this.createLocalizableString("complete", this);
        this.createLocalizableString("questionTitleTemplate", this, true);
        this.createLocalizableString("questionBodyTemplate", this, true);

        this.textPreProcessor = new TextPreProcessor();
        this.textPreProcessor.onHasValue = function (name: string) { return self.hasProcessedTextValue(name); };
        this.textPreProcessor.onProcess = function (name: string, returnDisplayValue: boolean) { return self.getProcessedTextValue(name, returnDisplayValue); };
        this.pagesValue = this.createNewArray("pages", function(value){ self.onPageAdded(value); });
        this.triggersValue = this.createNewArray("triggers", function(value){ value.setOwner(self); });
        this.updateProcessedTextValues();
        this.onBeforeCreating();
        if (jsonObj) {
            if (typeof jsonObj === 'string' || jsonObj instanceof String) {
                jsonObj = JSON.parse(jsonObj as string);
            }
            if(jsonObj && jsonObj.clientId) {
                this.clientId = jsonObj.clientId;
            }
            this.setJsonObject(jsonObj);
            if (this.surveyId) {
                this.loadSurveyFromService(this.surveyId, this.clientId);
            }
        }
        this.onCreating();
    }
    public getType(): string { return "survey"; }
    /**
     * The list of all pages in the survey, including invisible.
     * @see PageModel
     * @see visiblePages
     */
    public get pages(): Array<PageModel> { return this.pagesValue; }
    /**
     * The list of triggers in the survey.
     * @see SurveyTrigger
     */
    public get triggers(): Array<SurveyTrigger> { return this.triggersValue; }
    public set triggers(val: Array<SurveyTrigger>) { this.setPropertyValue("triggers", val); }
    /**
     * Set this property to automatically load survey Json from [dxsurvey.com](http://www.dxsurvey.com) service.
     * @see loadSurveyFromService
     */
    public get surveyId(): string { return this.getPropertyValue("surveyId", ""); }
    public set surveyId(val: string) { this.setPropertyValue("surveyId", val); }
    /**
     * Set this property to automatically save the data into the [dxsurvey.com](http://www.dxsurvey.com) service.
     * @see onComplete
     * @see surveyShowDataSaving
     */
    public get surveyPostId(): string { return this.getPropertyValue("surveyPostId", ""); }
    public set surveyPostId(val: string) { this.setPropertyValue("surveyPostId", val); }
    /**
     * Use this property as indentificator for a user, for example e-mail or unique customer id in your web application. If you are loading survey or posting survey results  from/to [dxsurvey.com](http://www.dxsurvey.com) service, then the library do not allow to run the same survey the second time. On the second run, the user will see the 'Thank you' page.
     */
    public get clientId(): string { return this.getPropertyValue("clientId", ""); }
    public set clientId(val: string) { this.setPropertyValue("clientId", val); }
    /**
     * If the property is not empty, before starting to run the survey, the library checkes if the cookie with this name exists. If it is true, the survey goes to complete mode and an user sees the 'Thank you' page. On completing the survey the cookie with this name is created.
     */
    public get cookieName(): string { return this.getPropertyValue("cookieName", ""); }
    public set cookieName(val: string) { this.setPropertyValue("cookieName", val); }
    /**
     * Set it to true, to save results on completing every page. onPartialSend event is fired.
     * @see onPartialSend
     * @see clientId
     */
    public get sendResultOnPageNext(): boolean { return this.getPropertyValue("sendResultOnPageNext", false); }
    public set sendResultOnPageNext(val: boolean) { this.setPropertyValue("sendResultOnPageNext", val); }
    /**
     * Set this property to true, to show the progress on saving/sending data into the [dxsurvey.com](http://www.dxsurvey.com) service.
     * @see surveyPostId
     */
    public get surveyShowDataSaving(): boolean { return this.getPropertyValue("surveyShowDataSaving", false); }
    public set surveyShowDataSaving(val: boolean) { this.setPropertyValue("surveyShowDataSaving", val); }
    /**
     * On showing the next or previous page, a first input is focused, if the property set to true.
     */
    public get focusFirstQuestionAutomatic(): boolean { return this.getPropertyValue("focusFirstQuestionAutomatic", true); }
    public set focusFirstQuestionAutomatic(val: boolean) { this.setPropertyValue("focusFirstQuestionAutomatic", val); }
    /**
     * Set it to false to hide 'Prev', 'Next' and 'Complete' buttons. It makes sense if you are going to create a custom navigation or have just one page or on setting goNextPageAutomatic property.
     * @see goNextPageAutomatic
     */
    public get showNavigationButtons(): boolean { return this.getPropertyValue("showNavigationButtons", true); }
    public set showNavigationButtons(val: boolean) { this.setPropertyValue("showNavigationButtons", val); }
    /**
     * Set it to false hide survey title.
     * @see title
     */
    public get showTitle(): boolean { return this.getPropertyValue("showTitle", true); }
    public set showTitle(val: boolean) { this.setPropertyValue("showTitle", val); }
    /**
     * Set it to false to hide page titles.
     * @see PageModel.title
     */
    public get showPageTitles(): boolean { return this.getPropertyValue("showPageTitles", true); }
    public set showPageTitles(val: boolean) { this.setPropertyValue("showPageTitles", val); }
    /**
     * On finishing the survey the 'Thank you', page on complete, is shown. Set the property to false, to hide the 'Thank you' page.
     * @see data
     * @see onComplete
     */
    public get showCompletedPage(): boolean { return this.getPropertyValue("showCompletedPage", true); }
    public set showCompletedPage(val: boolean) { this.setPropertyValue("showCompletedPage", val); }
    /**
     * A char/string that will be rendered in the title required questions.
     * @see QuestionBase.title
     */
    public get requiredText(): string { return this.getPropertyValue("requiredText", "*"); }
    public set requiredText(val: string) { this.setPropertyValue("requiredText", val); }
    /**
     * By default the first question index is 1. You may start it from 100 or from 'A', by setting 100 or 'A' to this property.
     * @see QuestionBase.title
     * @see requiredText
     */
    public get questionStartIndex(): string { return this.getPropertyValue("questionStartIndex", ""); }
    public set questionStartIndex(val: string) { this.setPropertyValue("questionStartIndex", val); };
    /**
     * By default the entered text in the others input in the checkbox/radiogroup/dropdown are stored as "question name " + "-Comment". The value itself is "question name": "others". Set this property to false, to store the entered text directly in the "question name" key.
     * @see commentPrefix
     */
    public get storeOthersAsComment(): boolean { return this.getPropertyValue("storeOthersAsComment", true); }
    public set storeOthersAsComment(val: boolean) { this.setPropertyValue("storeOthersAsComment", val); }
    /**
     * Set it true if you want to go to the next page without pressing 'Next' button when all questions are anwered.
    * @see showNavigationButtons 
     */
    public get goNextPageAutomatic(): boolean { return this.getPropertyValue("goNextPageAutomatic", false); }
    public set goNextPageAutomatic(val: boolean) { this.setPropertyValue("goNextPageAutomatic", val); }
    /**
     * Set it to 'onComplete', to remove from data property values of invisible questions on survey complete. In this case, the invisible questions will not be stored on the server.
     * </br> Set it to 'onHidden' to clear the question value when it becomes invisible.
     * </br> The default value is 'none'.
     * @see QuestionBase.visible
     * @see onComplete
     */
    public get clearInvisibleValues(): any { return this.getPropertyValue("clearInvisibleValues", "none"); }
    public set clearInvisibleValues(val: any) {
        if(val === true) val = "onComplete";
        if(val === false) val = "none"; 
        this.setPropertyValue("clearInvisibleValues", val); 
    }

    /**
     * Use it to change the survey locale. By default it is empty, 'en'. You may set it to 'de' - german, 'fr' - french and so on. The library has built-in localization for several languages. The library has a multi-language support as well.
     */
    public get locale(): string { return this.localeValue; }
    public set locale(value: string) {
        this.localeValue = value;
        this.setPropertyValue("locale", value);
        surveyLocalization.currentLocale = value;
        for(var i = 0; i < this.pages.length; i ++) {
            this.pages[i].onLocaleChanged();
        }
    }
    //ILocalizableOwner
    getLocale() { return this.locale; }
    public getMarkdownHtml(text: string)  {
        var options = {text: text, html: null}
        this.onTextMarkdown.fire(this, options);
        return options.html;
    }
    getLocString(str: string) { return surveyLocalization.getString(str); }
    /**
     * Returns the text that renders when there is no any visible page and question.
     */
    public get emptySurveyText(): string { return this.getLocString("emptySurvey"); }
    /**
     * Survey title.
     */
    public get title(): string { return this.getLocalizableStringText("title"); }
    public set title(value: string) { this.setLocalizableStringText("title", value); }
    get locTitle(): LocalizableString { return this.getLocalizableString("title"); }
    /**
     * The html that shows on completed ('Thank you') page. Set it to change the default text.
     * @see showCompletedPage
     * @see locale
     */
    public get completedHtml(): string { return this.getLocalizableStringText("completedHtml");}
    public set completedHtml(value: string) { this.setLocalizableStringText("completedHtml", value);}
    get locCompletedHtml(): LocalizableString { return this.getLocalizableString("completedHtml"); }
    /**
     * The html that shows if the end user has already completed the survey.
     * @see clientId
     * @see locale
     */
    public get completedBeforeHtml(): string { return this.getLocalizableStringText("completedBeforeHtml");}
    public set completedBeforeHtml(value: string) { this.setLocalizableStringText("completedBeforeHtml", value);}
    get locCompletedBeforeHtml(): LocalizableString { return this.getLocalizableString("completedBeforeHtml");}
    /**
     * The html that shows on loading survey Json from the dxsurvey.com service.
     * @see surveyId
     * @see locale
     */
    public get loadingHtml(): string { return this.getLocalizableStringText("loadingHtml");}
    public set loadingHtml(value: string) { this.setLocalizableStringText("loadingHtml", value);}
    get locLoadingHtml(): LocalizableString { return this.getLocalizableString("loadingHtml");}
    /**
     * A text that renders on the 'Prev' button. Set it to change the default text.
     * @see locale
     */
    public get pagePrevText(): string { return this.getLocalizableStringText("pagePrev", this.getLocString("pagePrevText")); }
    public set pagePrevText(newValue: string) { this.setLocalizableStringText("pagePrev", newValue); }
    get locPagePrevText(): LocalizableString { return this.getLocalizableString("pagePrev");}
    /**
     * A text that renders on the 'Next' button. Set it to change the default text.
     * @see locale
     */
    public get pageNextText(): string { return this.getLocalizableStringText("pageNext", this.getLocString("pageNextText")); }
    public set pageNextText(newValue: string) { this.setLocalizableStringText("pageNext", newValue); }
    get locPageNextText(): LocalizableString { return this.getLocalizableString("pageNext");}
    /**
     * A text that renders on the 'Complete' button. Set it to change the default text.
     * @see locale
     */
    public get completeText(): string { return this.getLocalizableStringText("complete", this.getLocString("completeText")); }
    public set completeText(newValue: string) { this.setLocalizableStringText("complete",  newValue); }
    get locCompleteText(): LocalizableString { return this.getLocalizableString("complete") ;}
    /**
     * A template for a question title.
     * @see QuestionModel.title
     */
    public get questionTitleTemplate(): string { return this.getLocalizableStringText("questionTitleTemplate");}
    public set questionTitleTemplate(value: string) { this.setLocalizableStringText("questionTitleTemplate", value);}
    /**
     * Returns the question title template
     * @see questionTitleTemplate
     * @see QuestionModel.title
     */
    public getQuestionTitleTemplate(): string { return this.locQuestionTitleTemplate.textOrHtml; }
    get locQuestionTitleTemplate(): LocalizableString { return this.getLocalizableString("questionTitleTemplate"); }
    /**
     * A template for a question body.
     * @see QuestionModel.body
     */
    public get questionBodyTemplate(): string { return this.getLocalizableStringText("questionBodyTemplate");}
    public set questionBodyTemplate(value: string) { this.setLocalizableStringText("questionBodyTemplate", value);}
    /**
     * Returns the question body template
     * @see questionBodyTemplate
     * @see QuestionModel.body
     */
    public getQuestionBodyTemplate(): string { return this.locQuestionBodyTemplate.textOrHtml; }
    public get locQuestionBodyTemplate(): LocalizableString { return this.getLocalizableString("questionBodyTemplate"); }

    /**
     * Set this property to false to turn off the numbering on pages titles.
     */
    public get showPageNumbers(): boolean { return this.getPropertyValue("showPageNumbers", false); }
    public set showPageNumbers(value: boolean) {
        if (value === this.showPageNumbers) return;
        this.setPropertyValue("showPageNumbers", value);
        this.updateVisibleIndexes();
    }
    /**
     * Set this property to "off" to turn off the numbering on questions titles or "onpage" to start numbering on every page. The default value is "on".
     */
    public get showQuestionNumbers(): string { return this.getPropertyValue("showQuestionNumbers", "on"); };
    public set showQuestionNumbers(value: string) {
        value = value.toLowerCase();
        value = (value === "onpage") ? "onPage" : value;
        if (value === this.showQuestionNumbers) return;
        this.setPropertyValue("showQuestionNumbers", value);
        this.updateVisibleIndexes();
    };
    /**
     * Set this property to "top" to show the progress bar on the bottom or to "bottom" to show it on the bottom.
     */
    public get showProgressBar(): string { return this.getPropertyValue("showProgressBar", "off"); }
    public set showProgressBar(newValue: string) {
      this.setPropertyValue("showProgressBar", newValue.toLowerCase());
    }
    /**
     * Returns the text/html that renders as survey title.
     */
    public get processedTitle() { return this.processText(this.locTitle.textOrHtml, true); }
    /**
     * Set this property to 'bottom' to show question title under the question.
     */
    public get questionTitleLocation(): string { return this.getPropertyValue("questionTitleLocation", "top"); };
    public set questionTitleLocation(value: string) {
        this.setPropertyValue("questionTitleLocation", value.toLowerCase());
    };
    /**
     * Set this property to 'bottom' to show question error(s) under the question.
     */
    public get questionErrorLocation(): string { return this.getPropertyValue("questionErrorLocation", "top"); };
    public set questionErrorLocation(value: string) {
        this.setPropertyValue("questionErrorLocation", value.toLowerCase());
    };
    /**
     * Set this mode to 'display' to make the survey read-only. 
     */
    public get mode(): string { return this.getPropertyValue("mode", "edit"); }
    public set mode(value: string) {
        value = value.toLowerCase();
        if (value == this.mode) return;
        if (value != "edit" && value != "display") return;
        this.setPropertyValue("mode", value)
        var questions = this.getAllQuestions();
        for(var i = 0; i < questions.length; i ++) {
            questions[i].onReadOnlyChanged();
        }
    }
    /**
     * An object that stores the survey results/data. You may set it directly as { 'question name': questionValue, ... }
     * @see setValue
     * @see getValue
     */
    public get data(): any {
        var result = {};
        for (var key in this.valuesHash) {
            result[key] = this.valuesHash[key];
        }
        return result;
    }
    getAllValues() : any { return this.data; }
    public set data(data: any) {
        this.valuesHash = {};
        if (data) {
            for (var key in data) {
                this.setDataValueCore(this.valuesHash, key, data[key]);
                this.checkTriggers(key, data[key], false);
                if (!this.processedTextValues[key.toLowerCase()]) {
                    this.processedTextValues[key.toLowerCase()] = "value";
                }
            }
        }
        this.notifyAllQuestionsOnValueChanged();
        this.runConditions();
    }
    protected setDataValueCore(valuesHash: any, key: string, value: any) {
        valuesHash[key] = value;
    }
    /**
     * Returns all comments from the data.
     * @see data
     */
    public get comments(): any {
        var result = {};
        for (var key in this.valuesHash) {
            if (key.indexOf(this.commentPrefix) > 0) {
                result[key] = this.valuesHash[key];
            }
        }
        return result;
    }
    /**
     * Returns the list of visible pages. If all pages are visible then it is the same as pages property.
     * @see pages
     * @see PageModel.visible
     * @see PageModel.visibleIf
     */
    public get visiblePages(): Array<PageModel> {
        if (this.isDesignMode) return this.pages;
        var result = new Array<PageModel>();
        for (var i = 0; i < this.pages.length; i++) {
            if (this.pages[i].isVisible) {
                result.push(this.pages[i]);
            }
        }
        return result;
    }
    /**
     * Returns true if there is no any page in the survey. The survey is empty.
     */
    public get isEmpty(): boolean { return this.pages.length == 0; }
    /**
     * depricated, misspelling, use pageCount property
     */
    get PageCount(): number { return this.pageCount; }
    /**
     * Returns the survey pages count.
     * @see visiblePageCount
     * @see pages
     */
    public get pageCount(): number {
        return this.pages.length;
    }
    /**
     * Returns the survey visible pages count
     * @see pageCount
     * @see visiblePages
     */
    public get visiblePageCount(): number {
        return this.visiblePages.length;
    }
    /**
     * Returns the current survey page. If survey is rendred then it is a page that a user can see/edit.
     */
    public get currentPage(): PageModel {
        var vPages = this.visiblePages;
        if (this.currentPageValue != null) {
            if (vPages.indexOf(this.currentPageValue) < 0) {
                this.currentPage = null;
            }
        }
        if (this.currentPageValue == null && vPages.length > 0) {
            this.currentPage = vPages[0];
        }
        return this.currentPageValue;
    }
    public set currentPage(value: PageModel) {
        var vPages = this.visiblePages;
        if (value != null && vPages.indexOf(value) < 0) return;
        if (value == this.currentPageValue) return;
        var oldValue = this.currentPageValue;
        this.currentPageValue = value;
        if(value) value.updateCustomWidgets();
        this.currentPageChanged(value, oldValue);
    }
    /**
     * The index of the current page in the visible pages array. It starts from 0.
     */
    public get currentPageNo(): number {
        return this.visiblePages.indexOf(this.currentPage);
    }
    public set currentPageNo(value: number) {
        var vPages = this.visiblePages;
        if (value < 0 || value >= this.visiblePages.length) return;
        this.currentPage = this.visiblePages[value];
    }
    /**
     * Set the input focuse to the first question with the input.
     */
    public focusFirstQuestion() {
        if (this.currentPageValue) {
            this.currentPageValue.scrollToTop();
            this.currentPageValue.focusFirstQuestion();
        }
    }
    /**
     * Returns the current survey state: 'loading' - loading from the json, 'completed' - a user has completed the survey, 'running' - a user answers a questions right now, 'empty' - there is nothing to show in the current survey.
     */
    public get state(): string {
        if (this.isLoading) return "loading";
        if (this.isCompleted) return "completed";
        if (this.isCompletedBefore) return "completedbefore";
        return (this.currentPage) ? "running" : "empty"
    }
    public get completedState(): string {return this.completedStateValue; }
    get completedStateText(): string { return this.completedStateTextValue; }
    protected setCompletedState(value: string, text: string) {
        this.completedStateValue = value;
        if(!text) {
            if(value == "saving") text = this.getLocString("savingData");
            if(value == "error") text = this.getLocString("savingDataError");
            if(value == "success") text = this.getLocString("savingDataSuccess");
        }
        this.completedStateTextValue = text;
    }
    /**
     * Clear the survey data and state. If the survey has a 'completed' state, it will have a 'running' state.
     * @param clearData clear the data
     * @param gotoFirstPage make the first page as a current page.
     * @see data
     * @see state
     * @see currentPage
     */
    public clear(clearData: boolean = true, gotoFirstPage: boolean = true) {
        if (clearData) {
            this.data = null;
            this.variablesHash = {};
        }
        this.isCompleted = false;
        this.isCompletedBefore = false;
        this.isLoading = false;
        if (gotoFirstPage && this.visiblePageCount > 0) {
            this.currentPage = this.visiblePages[0];
        }
    }
    protected mergeValues(src: any, dest: any) {
        if (!dest || !src) return;
        for (var key in src) {
            var value = src[key];
            if (value && typeof value === 'object') {
                if (!dest[key]) dest[key] = {};
                this.mergeValues(value, dest[key]);
            } else {
                dest[key] = value;
            }
        }
    }
    protected updateCustomWidgets(page: PageModel) {
        if (!page) return;
        page.updateCustomWidgets();
    }
    protected currentPageChanged(newValue: PageModel, oldValue: PageModel) {
        this.onCurrentPageChanged.fire(this, { 'oldCurrentPage': oldValue, 'newCurrentPage': newValue });
    }
    /**
     * Returns the progress that a user made by answering on the survey.
     */
    public getProgress(): number {
        if (this.currentPage == null) return 0;
        var index = this.visiblePages.indexOf(this.currentPage) + 1;
        return Math.ceil((index * 100 / this.visiblePageCount));
    }
    /**
     * Returns true if navigation buttons: 'Prev', 'Next' or 'Complete' are shown.
     */
    public get isNavigationButtonsShowing(): boolean {
        if (this.isDesignMode) return false;
        var page = this.currentPage;
        if (!page) return false;
        return page.navigationButtonsVisibility == "show" ||
            (page.navigationButtonsVisibility != "hide" && this.showNavigationButtons);
    }
    /**
     * Returns true if the survey in the edit mode.
     * @see mode
     */
    public get isEditMode(): boolean { return this.mode == "edit"; }
    /**
     * Returns true if the survey in the display mode.
     * @see mode
     */
    public get isDisplayMode(): boolean { return this.mode == "display"; }
    /**
     * Returns true if the survey in the design mode. It is used by SurveyJS Editor
     * @see setDesignMode 
     */
    public get isDesignMode(): boolean { return this.getPropertyValue("isDesignMode", false); }
    /**
     * Call it to set the survey into the design mode.
     * @param value use true to set the survey into the design mode.
     */
    public setDesignMode(value: boolean) {
        this.setPropertyValue("isDesignMode", value);
    }
    /**
     * Returns true, if a user has already completed the survey on this browser and there is a cookie about it. Survey goes to 'completed' state if the function returns true.
     * @see cookieName
     * @see setCookie
     * @see deleteCookie  
     * @see state
     */
    public get hasCookie(): boolean {
        if (!this.cookieName) return false;
        var cookies = document.cookie;
        return cookies && cookies.indexOf(this.cookieName + "=true") > -1;
    }
    /**
     * Set the cookie with cookieName in the browser. It is done automatically on survey complete if cookieName is not empty.
     * @see cookieName
     * @see hasCookie
     * @see deleteCookie  
     */
    public setCookie() {
        if (!this.cookieName) return;
        document.cookie = this.cookieName + "=true; expires=Fri, 31 Dec 9999 0:0:0 GMT";
    }
    /**
     * Delete the cookie with cookieName in the browser. 
     * @see cookieName
     * @see hasCookie
     * @see setCookie  
     */
    public deleteCookie() {
        if (!this.cookieName) return;
        document.cookie = this.cookieName + "=;";
    }
    /**
     * Call it to go to the next page. It returns false, if it is the last page. If there is an error, for example required question is empty, the function returns false as well.
     * @see isCurrentPageHasErrors
     * @see prevPage
     * @see completeLastPage
     */
    public nextPage(): boolean {
        if (this.isLastPage) return false;
        if (this.isEditMode && this.isCurrentPageHasErrors) return false;
        if (this.doServerValidation()) return false;
        this.doNextPage();
        return true;
    }
    /**
     * Returns true, if there is any error on the current page. For example, the required question is empty or a question validation is failed.
     * @see nextPage
     */
    public get isCurrentPageHasErrors(): boolean {
        if (this.currentPage == null) return true;
        return this.currentPage.hasErrors(true, true);
    }
    /**
     * Call it to go to the previous page. It returns false if the current page is the first page already. It doesn't perform any checks, required questions can be empty.
     * @see isFirstPage
     */
    public prevPage(): boolean {
        if (this.isFirstPage) return false;
        var vPages = this.visiblePages;
        var index = vPages.indexOf(this.currentPage);
        this.currentPage = vPages[index - 1];
    }
    /**
     * Call it to complete the survey, if the current page is the last one. It returns false if there is an error on the page.
     * @see isCurrentPageHasErrors
     * @see nextPage
     */
    public completeLastPage() : boolean {
        if (this.isEditMode && this.isCurrentPageHasErrors) return false;
        if (this.doServerValidation()) return false;
        this.doComplete();
        return true;
    }
    /**
     * Returns true if the current page is the first one.
     */
    public get isFirstPage(): boolean {
        if (this.currentPage == null) return true;
        return this.visiblePages.indexOf(this.currentPage) == 0;
    }
    /**
     * Returns true if the current page is the last one.
     */
    public get isLastPage(): boolean {
        if (this.currentPage == null) return true;
        var vPages = this.visiblePages;
        return vPages.indexOf(this.currentPage) == vPages.length - 1;
    }
    /**
     * Call it to complete the survey. It writes cookie if cookieName property is not empty, set the survey into 'completed' state, fire onComplete event and sendResult into [dxsurvey.com](http://www.dxsurvey.com) service if surveyPostId property is not empty.
     * @see cookieName
     * @see state
     * @see onComplete
     * @see surveyPostId
     */
    public doComplete() {
        let previousCookie = this.hasCookie;
        this.clearUnusedValues();
        this.setCookie();
        this.setCompleted();
        var self = this;
        var onCompleteOptions = {
            showDataSaving: function(text: string) {self.setCompletedState("saving", text);},
            showDataSavingError: function(text: string) {self.setCompletedState("error", text);},
            showDataSavingSuccess: function(text: string) {self.setCompletedState("success", text);},
            showDataSavingClear: function(text: string) {self.setCompletedState("", "");}
        };
        this.onComplete.fire(this, onCompleteOptions);
        if (!previousCookie && this.surveyPostId) {
            this.sendResult();
        }
    }
    /**
     * Returns true, if at the current moment the question values on the current page are validating on the server.
     * @see onServerValidateQuestions
     */
    public get isValidatingOnServer(): boolean { return this.getPropertyValue("isValidatingOnServer", false); }
    private setIsValidatingOnServer(val: boolean) {
        if (val == this.isValidatingOnServer) return;
        this.setPropertyValue("isValidatingOnServer", val);
        this.onIsValidatingOnServerChanged();
    }
    protected onIsValidatingOnServerChanged() { }
    protected doServerValidation(): boolean {
        if (!this.onServerValidateQuestions) return false;
        var self = this;
        var options = { data: {}, errors: {}, survey: this, complete : function () { self.completeServerValidation(options); } };
        for (var i = 0; i < this.currentPage.questions.length; i++) {
            var question = this.currentPage.questions[i];
            if (!question.visible) continue;
            var value = this.getValue(question.name);
            if (!Base.isValueEmpty(value)) options.data[question.name] = value;
        }
        this.setIsValidatingOnServer(true);
        this.onServerValidateQuestions(this, options);
        return true;
    }
    private completeServerValidation(options: any) {
        this.setIsValidatingOnServer(false);
        if (!options && !options.survey) return;
        var self = options.survey;
        var hasErrors = false;
        if (options.errors) {
            for (var name in options.errors) {
                var question = self.getQuestionByName(name);
                if (question && question["errors"]) {
                    hasErrors = true;
                    question["addError"](new CustomError(options.errors[name]));
                }
            }
        }
        if (!hasErrors) {
            if (self.isLastPage) self.doComplete();
            else self.doNextPage();
        }
    }
    protected doNextPage() {
        this.checkOnPageTriggers();
        if (this.sendResultOnPageNext) {
            this.sendResult(this.surveyPostId, this.clientId, true);
        }
        var vPages = this.visiblePages;
        var index = vPages.indexOf(this.currentPage);
        this.currentPage = vPages[index + 1];
    }
    protected setCompleted() {
        this.isCompleted = true;
    }
    /**
     * Returns the html for completed 'Thank you' page.
     * @see completedHtml
     */
    public get processedCompletedHtml(): string {
        if (this.completedHtml) {
            return this.processHtml(this.completedHtml);
        }
        return "<h3>" + this.getLocString("completingSurvey") + "</h3>";
    }
    /**
     * Returns the html showing that the user has already completed the survey
     * @see completedHtml
     */
    public get processedCompletedBeforeHtml(): string {
        if (this.completedBeforeHtml) {
            return this.processHtml(this.completedBeforeHtml);
        }
        return "<h3>" + this.getLocString("completingSurveyBefore") + "</h3>";
    }
    /**
     * Returns the html that shows on loading the json.
     */
    public get processedLoadingHtml(): string {
        if (this.loadingHtml) {
            return this.processHtml(this.loadingHtml);
        }
        return "<h3>" + this.getLocString("loadingSurvey") + "</h3>";
    }
    /**
     * Returns the text for the current progress.
     */
    public get progressText(): string {
        if (this.currentPage == null) return "";
        var vPages = this.visiblePages;
        var index = vPages.indexOf(this.currentPage) + 1;
        return this.getLocString("progressText")["format"](index, vPages.length);
    }
    protected afterRenderSurvey(htmlElement) {
        this.onAfterRenderSurvey.fire(this, { survey: this, htmlElement: htmlElement });
    }
    updateQuestionCssClasses(question: IQuestion, cssClasses: any) {
        this.onUpdateQuestionCssClasses.fire(this, { question: question, cssClasses: cssClasses });
    }
    afterRenderPage(htmlElement) {
        if (this.onAfterRenderPage.isEmpty) return;
        this.onAfterRenderPage.fire(this, { page: this.currentPage, htmlElement: htmlElement });
    }
    afterRenderQuestion(question: IQuestion, htmlElement) {
        this.onAfterRenderQuestion.fire(this, { question: question, htmlElement: htmlElement });
    }
    afterRenderPanel(panel: IElement, htmlElement) {
        this.onAfterRenderPanel.fire(this, { panel: panel, htmlElement: htmlElement });
    }
    matrixRowAdded(question: IQuestion) {
        this.onMatrixRowAdded.fire(this, {question: question});
    }
    matrixRowRemoved(question: IQuestion, rowIndex: number, row: any) {
        this.onMatrixRowRemoved.fire(this, {question: question, rowIndex: rowIndex, row: row});
    }
    matrixCellCreated(question: IQuestion, options: any) {
        options.question = question;
        this.onMatrixCellCreated.fire(this, options);
    }
    matrixCellValueChanged(question: IQuestion, options: any) {
        options.question = question;
        this.onMatrixCellValueChanged.fire(this, options);
    }
    matrixCellValidate(question: IQuestion, options: any): SurveyError {
        options.question = question;
        this.onMatrixCellValidate.fire(this, options);
        return options.error ? new CustomError(options.error) : null;
    }
    /**
     * Upload the file into servey
     * @param name question name
     * @param file uploading file
     * @param storeDataAsText set it to true to encode file content into the survey results
     * @param uploadingCallback a call back function to get the status on uploading the file
     */
    public uploadFile(name: string, file: File, storeDataAsText: boolean, uploadingCallback: (status: string)=>any): boolean {
        var accept = true;
        this.onUploadFile.fire(this, { name: name, file: file, accept: accept });
        if (!accept) return false;
        if (!storeDataAsText && this.surveyPostId) {
            this.uploadFileCore(name, file, uploadingCallback);
        }
        return true;
    }
    protected createSurveyService() : dxSurveyService {
        return new dxSurveyService();
    }
    protected uploadFileCore(name: string, file: File, uploadingCallback: (status: string) => any) {
        var self = this;
        if (uploadingCallback) uploadingCallback("uploading");
        this.createSurveyService().sendFile(this.surveyPostId, file, function (success: boolean, response: any) {
            if (uploadingCallback) uploadingCallback(success ? "success" : "error");
            if (success) {
                self.setValue(name, response);
            }
        });
    }
    getPage(index: number): PageModel {
        return this.pages[index];
    }
    /**
     * Add a page into the survey
     * @param page
     * @see addNewPage
     */
    public addPage(page: PageModel) {
        if (page == null) return;
        this.pages.push(page);
        this.updateVisibleIndexes();
    }
    /**
     * Creates a new page and adds it into the survey. Genarates a new name if the name parameter is not set.
     * @param name a page name
     * @see addPage
     */
    public addNewPage(name: string = null) {
        var page = this.createNewPage(name);
        this.addPage(page);
        return page;
    }
    /**
     * Remove the page from the survey
     * @param page 
     */
    public removePage(page: PageModel) {
        var index = this.pages.indexOf(page);
        if (index < 0) return;
        this.pages.splice(index, 1);
        if (this.currentPageValue == page) {
            this.currentPage = this.pages.length > 0 ? this.pages[0] : null;
        }
        this.updateVisibleIndexes();
    }
    /**
     * Returns a question by its name
     * @param name a question name
     * @param caseInsensitive 
     */
    public getQuestionByName(name: string, caseInsensitive: boolean = false): IQuestion {
        var questions = this.getAllQuestions();
        if (caseInsensitive) name = name.toLowerCase();
        for (var i: number = 0; i < questions.length; i++) {
            var questionName = questions[i].name;
            if (caseInsensitive) questionName = questionName.toLowerCase();
            if(questionName == name) return questions[i];
        }
        return null;
    }
    /**
     * Get a list of questions by their names
     * @param names the array of names
     * @param caseInsensitive 
     */
    public getQuestionsByNames(names: string[], caseInsensitive: boolean = false): IQuestion[] {
        var result = [];
        if (!names) return result;
        for (var i: number = 0; i < names.length; i++) {
            if (!names[i]) continue;
            var question = this.getQuestionByName(names[i], caseInsensitive);
            if (question) result.push(question);
        }
        return result;
    }
    /**
     * Returns a page on which an element (question or panel) is placed.
     * @param element Question or Panel
     */
    public getPageByElement(element: IElement): PageModel {
        for (var i: number = 0; i < this.pages.length; i++) {
            var page = this.pages[i];
            if(page.containsElement(element)) return page;
        }
        return null;
    }
    /**
     * Returns a page on which a question is located
     * @param question 
     */
    public getPageByQuestion(question: IQuestion): PageModel {
        return this.getPageByElement(question);
    }
    /**
     * Returns a page by it's name.
     * @param name 
     */
    public getPageByName(name: string): PageModel {
        for (var i: number = 0; i < this.pages.length; i++) {
            if (this.pages[i].name == name) return this.pages[i];
        }
        return null;
    }
    /**
     * Rertuns a list of pages by their names
     * @param names a list of pages names
     */
    public getPagesByNames(names: string[]): PageModel[]{
        var result = [];
        if (!names) return result;
        for (var i: number = 0; i < names.length; i++) {
            if (!names[i]) continue;
            var page = this.getPageByName(names[i]);
            if (page) result.push(page);
        }
        return result;
    }
    /**
     * Returns the list of all questions in the survey
     * @param visibleOnly set it true, if you want to get only visible questions
     */
    public getAllQuestions(visibleOnly: boolean = false, includingDesignTime: boolean = false): Array<IQuestion> {
        var result = new Array<IQuestion>();
        for (var i: number = 0; i < this.pages.length; i++) {
            this.pages[i].addQuestionsToList(result, visibleOnly, includingDesignTime);
        }
        return result;
    }
    /**
     * Returns the list of all panels in the survey
     */
    public getAllPanels(visibleOnly: boolean = false, includingDesignTime: boolean = false): Array<IPanel> {
        var result = new Array<IPanel>();
        for (var i: number = 0; i < this.pages.length; i++) {
            this.pages[i].addPanelsIntoList(result, visibleOnly, includingDesignTime);
        }
        return result;
    }
    protected createNewPage(name: string) { return new PageModel(name); }
    protected notifyQuestionOnValueChanged(name: string, newValue: any) {
       var questions = this.getAllQuestions();
        var question = null;
        for (var i: number = 0; i < questions.length; i++) {
            if (questions[i].name != name) continue;
            question = questions[i];
            this.doSurveyValueChanged(question, newValue);
            this.onValueChanged.fire(this, { 'name': name, 'question': question, 'value': newValue });
        }
        if(!question) {
            this.onValueChanged.fire(this, { 'name': name, 'question': null, 'value': newValue });
        }
        this.notifyElementsOnAnyValueOrVariableChanged(name);
    }
    private notifyElementsOnAnyValueOrVariableChanged(name: string) {
        for(var i = 0; i < this.pages.length; i ++) {
            this.pages[i].onAnyValueChanged(name)
        }
    }
    private notifyAllQuestionsOnValueChanged() {
        var questions = this.getAllQuestions();
        for (var i: number = 0; i < questions.length; i++) {
            this.doSurveyValueChanged(questions[i], this.getValue(questions[i].name));
        }
    }
    protected doSurveyValueChanged(question: IQuestion, newValue: any) {
        question.onSurveyValueChanged(newValue);
    }
    private checkOnPageTriggers() {
        var questions = this.getCurrentPageQuestions();
        for (var i = 0; i < questions.length; i++) {
            var question = questions[i];
            var value = this.getValue(question.name);
            this.checkTriggers(question.name, value, true);
        }
    }
    private getCurrentPageQuestions(): Array<QuestionBase> {
        var result = [];
        var page = this.currentPage;
        if (!page) return result;
        for (var i = 0; i < page.questions.length; i++) {
            var question = page.questions[i];
            if (!question.visible || !question.name) continue;
            result.push(question);
        }
        return result;
    }
    private checkTriggers(name: string, newValue: any, isOnNextPage: boolean) {
        for (var i: number = 0; i < this.triggers.length; i++) {
            var trigger = this.triggers[i];
            if (trigger.name == name && trigger.isOnNextPage == isOnNextPage) {
                trigger.check(newValue);
            }
        }
    }
    private doElementsOnLoad() {
        for(var i = 0; i < this.pages.length; i ++) {
            this.pages[i].onSurveyLoad();
        }
    }
    private runConditions() {
        var pages = this.pages;
        for(var i = 0; i < pages.length; i ++) {
            pages[i].runCondition(this.valuesHash);
        }
    }
    /**
     * Send the survey result into [dxsurvey.com](http://www.dxsurvey.com) service.
     * @param postId [dxsurvey.com](http://www.dxsurvey.com) service postId
     * @param clientId Typically a customer e-mail or an identificator
     * @param isPartialCompleted Set it to true if the survey is not completed yet and it is an intermediate results
     * @see surveyPostId
     * @see clientId
     */
    public sendResult(postId: string = null, clientId: string = null, isPartialCompleted: boolean = false) {
        if (!this.isEditMode) return;
        if (isPartialCompleted && this.onPartialSend) {
            this.onPartialSend.fire(this, null);
        }

        if (!postId && this.surveyPostId) {
            postId = this.surveyPostId;
        }
        if (!postId) return;
        if (clientId) {
            this.clientId = clientId;
        }
        if (isPartialCompleted && !this.clientId) return;
        var self = this;
        if(this.surveyShowDataSaving) {
            this.setCompletedState("saving", "");
        }
        this.createSurveyService().sendResult(postId, this.data, function (success: boolean, response: any) {
            if(self.surveyShowDataSaving) {
                if(success) {
                    self.setCompletedState("success", "");
                } else {
                    self.setCompletedState("error", "");
                }
            }
            self.onSendResult.fire(self, { success: success, response: response});
        }, this.clientId, isPartialCompleted);
    }
    /**
     * It calls the [dxsurvey.com](http://www.dxsurvey.com) service and on callback fires onGetResult event with all answers that your users made for a question.
     * @param resultId [dxsurvey.com](http://www.dxsurvey.com) service resultId
     * @param name The question name
     * @see onGetResult
     */
    public getResult(resultId: string, name: string) {
        var self = this;
        this.createSurveyService().getResult(resultId, name, function (success: boolean, data: any, dataList: any[], response: any) {
            self.onGetResult.fire(self, { success: success, data: data, dataList: dataList, response: response });
        });
    }
    /**
     * Loads the survey Json from the [dxsurvey.com](http://www.dxsurvey.com) service. If clientId is not null and user has already completed the survey, the survey will go into "completedbefore" state.
     * @param surveyId [dxsurvey.com](http://www.dxsurvey.com) service surveyId
     * @param clientId indentificator for a user, for example e-mail or unique customer id in your web application. 
     * @see state
     */
    public loadSurveyFromService(surveyId: string = null, cliendId: string = null) {
        if (surveyId) {
            this.surveyId = surveyId;
        }
        if(cliendId) {
            this.clientId = cliendId;
        }
        var self = this;
        this.isLoading = true;
        this.onLoadingSurveyFromService();
        if(cliendId) {
            this.createSurveyService().getSurveyJsonAndIsCompleted(this.surveyId, this.clientId, function (success: boolean, json: string, isCompleted: string, response: any) {
                self.isLoading = false;
                if (success) {
                    self.isCompletedBefore = isCompleted == "completed";
                    self.loadSurveyFromServiceJson(json);
                }
            });
        } else {
            this.createSurveyService().loadSurvey(this.surveyId, function (success: boolean, result: string, response: any) {
                self.isLoading = false;
                if (success) {
                    self.loadSurveyFromServiceJson(result);
                }
            });
        }
    }
    private loadSurveyFromServiceJson(json: any) {
        if(!json) return;
        this.setJsonObject(json);
        this.notifyAllQuestionsOnValueChanged();
        this.onLoadSurveyFromService();
    }
    protected onLoadingSurveyFromService() {
    }
    protected onLoadSurveyFromService() {
    }
    private checkPageVisibility(question: IQuestion, oldQuestionVisible: boolean) {
        var page = this.getPageByQuestion(question);
        if (!page) return;
        var newValue = page.isVisible;
        if (newValue != page.getIsPageVisible(question) || oldQuestionVisible) {
            this.pageVisibilityChanged(page, newValue);
        }
    }
    private updateVisibleIndexes() {
        this.updatePageVisibleIndexes(this.showPageNumbers);
        if (this.showQuestionNumbers == "onPage") {
            var visPages = this.visiblePages;
            for (var i = 0; i < visPages.length; i++) {
                this.updateQuestionVisibleIndexes(visPages[i].questions, true);
            }
        } else {
            this.updateQuestionVisibleIndexes(this.getAllQuestions(false), this.showQuestionNumbers == "on");
        }
    }
    private updatePageVisibleIndexes(showIndex: boolean) {
        var index = 0;
        for (var i = 0; i < this.pages.length; i++) {
            this.pages[i].visibleIndex = this.pages[i].visible ? (index++) : -1;
            this.pages[i].num = showIndex && this.pages[i].visible ? this.pages[i].visibleIndex + 1 : -1;
        }
    }
    private updateQuestionVisibleIndexes(questions: IQuestion[], showIndex: boolean) {
        SurveyElement.setVisibleIndex(questions, 0, showIndex);
    }
    private setJsonObject(jsonObj: any) {
        if (!jsonObj) return;
        this.jsonErrors = null;
        var jsonConverter = new JsonObject();
        jsonConverter.toObject(jsonObj, this);
        if (jsonConverter.errors.length > 0) {
            this.jsonErrors = jsonConverter.errors;
        }
    }
    endLoadingFromJson() {
        this.runConditions();
        this.updateVisibleIndexes();
        this.updateProcessedTextValues();
        super.endLoadingFromJson();
        if (this.hasCookie) {
            this.doComplete();
        }
        this.doElementsOnLoad();
    }
    protected onBeforeCreating() { }
    protected onCreating() { }
    private updateProcessedTextValues() {
        this.processedTextValues = {};
        var self = this;
        this.processedTextValues["pageno"] = function (name) { return self.currentPage != null ? self.visiblePages.indexOf(self.currentPage) + 1 : 0; }
        this.processedTextValues["pagecount"] = function (name) { return self.visiblePageCount; }
        var questions = this.getAllQuestions();
        for (var i = 0; i < questions.length; i++) {
            this.addQuestionToProcessedTextValues(questions[i]);
        }
    }
    private addQuestionToProcessedTextValues(question: IQuestion) {
        this.processedTextValues[question.name.toLowerCase()] = "question";
    }
    private hasProcessedTextValue(name: string): boolean {
        var firstName = new ProcessValue().getFirstName(name);
        return this.processedTextValues[firstName.toLowerCase()];
    }
    private getProcessedTextValue(name: string, returnDisplayValue: boolean): any {
        var firstName = new ProcessValue().getFirstName(name);
        var val = this.processedTextValues[firstName.toLowerCase()];
        if (!val) return null;
        if (val == "variable") {
            return this.getVariable(name.toLowerCase());
        }
        if (val == "question") {
            var question = this.getQuestionByName(firstName, true);
            if (!question) return null;
            name = question.name + name.substr(firstName.length);
            var values = {};
            values[firstName] = returnDisplayValue ? question.displayValue : this.getValue(firstName);
            return new ProcessValue().getValue(name, values);
        }
        if (val == "value") {
            return new ProcessValue().getValue(name, this.valuesHash);
        }
        return val(name);
    }
    private clearUnusedValues() {
        var questions = this.getAllQuestions();
        for (var i: number = 0; i < questions.length; i++) {
            questions[i].clearUnusedValues();
        }
        if (this.clearInvisibleValues == "onComplete") {
            this.clearInvisibleQuestionValues();
        }
    }
    private clearInvisibleQuestionValues() {
        var questions = this.getAllQuestions();
        for (var i: number = 0; i < questions.length; i++) {
            if (questions[i].visible) continue;
            this.clearValue(questions[i].name);
        }
    }
    /**
     * Returns a variable value. Variable, unlike values, are not stored in the survey results.
     * @param name A variable name
     * @see SetVariable
     */
    public getVariable(name: string): any {
        if (!name) return null;
        return this.variablesHash[name];
    }
    /**
     * Sets a variable value. Variable, unlike values, are not stored in the survey results.
     * @param name A variable name
     * @param newValue 
     * @see GetVariable
     */
    public setVariable(name: string, newValue: any) {
        if (!name) return;
        this.variablesHash[name] = newValue;
        this.processedTextValues[name.toLowerCase()] = "variable";
        this.notifyElementsOnAnyValueOrVariableChanged(name);
    }
    //ISurvey data
    protected getUnbindValue(value: any): any {
        if (value && value instanceof Object) {
            //do not return the same object instance!!!
            return JSON.parse(JSON.stringify(value));
        }
        return value;
    }
    /**
     * Returns a question value
     * @param name A question name
     * @see data
     * @see setValue
     */
    public getValue(name: string): any {
        if (!name || name.length == 0) return null;
        var value = this.valuesHash[name];
        return this.getUnbindValue(value);
    }
    /**
     * Sets a question value. It runs all triggers and conditions (visibleIf properties). Goes to the next page if goNextPageAutomatic is true and all questions on the current page are answered correctly.
     * @param name A question name
     * @param newValue
     * @see data
     * @see getValue
     * @see PageModel.visibleIf
     * @see QuestionBase.visibleIf
     * @see goNextPageAutomatic
     */
    public setValue(name: string, newValue: any) {
        if (this.isValueEqual(name, newValue)) return;
        if (Base.isValueEmpty(newValue)) {
            delete this.valuesHash[name];
        } else {
            newValue = this.getUnbindValue(newValue);
            this.setDataValueCore(this.valuesHash, name, newValue);
            var processedVar = this.processedTextValues[name.toLowerCase()];
            if(!processedVar) {
                this.processedTextValues[name.toLowerCase()] = "value";
            }
        }
        this.notifyQuestionOnValueChanged(name, newValue);
        this.checkTriggers(name, newValue, false);
        this.runConditions();
        this.tryGoNextPageAutomatic(name);
    }
    private isValueEqual(name: string, newValue: any): boolean {
        if (newValue == "") newValue = null;
        var oldValue = this.getValue(name);
        if (newValue === null || oldValue === null) return newValue === oldValue;
        return this.isTwoValueEquals(newValue, oldValue);
    }
    private onPageAdded(page: PageModel) {
        page.setSurveyImpl(this);
        if(!page.name) page.name = this.generateNewName(this.pages, "page");
    }
    private generateNewName(elements: Array<any>, baseName: string): string {
        var keys = {};
        for(var i = 0; i < elements.length; i ++) keys[elements[i]["name"]] = true;
        var index = 1;
        while(keys[baseName + index]) index ++;
        return baseName + index;
    }
    protected tryGoNextPageAutomatic(name: string) {
        if (!this.goNextPageAutomatic || !this.currentPage) return;
        var question = this.getQuestionByName(name);
        if (question && (!question.visible || !question.supportGoNextPageAutomatic())) return;
        var questions = this.getCurrentPageQuestions();
        for (var i = 0; i < questions.length; i++) {
            var value = this.getValue(questions[i].name)
            if (questions[i].hasInput && Base.isValueEmpty(value)) return;
        }
        if (!this.currentPage.hasErrors(true, false)) {
            if (!this.isLastPage) {
                this.nextPage();
            } else {
                this.completeLastPage();
            }
        }
    }
    /**
     * Returns the comment value
     * @param name 
     * @see setComment
     */
    public getComment(name: string): string {
        var result = this.data[name + this.commentPrefix];
        if (result == null) result = "";
        return result;
    }
    /**
     * Set the comment value
     * @param name 
     * @param newValue
     * @see getComment 
     */
    public setComment(name: string, newValue: string) {
        var commentName = name + this.commentPrefix;
        if (newValue === "" || newValue === null) {
            delete this.valuesHash[commentName];
        } else {
            this.setDataValueCore(this.valuesHash, commentName, newValue);
            this.tryGoNextPageAutomatic(name);
        }
        var question = this.getQuestionByName(name);
        if(question) {
            this.onValueChanged.fire(this, { 'name': commentName, 'question': question, 'value': newValue });
        }
    }
    /**
     * Remove the value from the survey result.
     * @param {string} name The name of the value. Typically it is a question name
     */
    public clearValue(name: string) {
        this.setValue(name, null);
        this.setComment(name, null);
    }
    questionVisibilityChanged(question: IQuestion, newValue: boolean) {
        this.updateVisibleIndexes();
        this.onVisibleChanged.fire(this, { 'question': question, 'name': question.name, 'visible': newValue });
        this.checkPageVisibility(question, !newValue);
        if(question && !question.visible && this.clearInvisibleValues == "onHidden") {
            this.clearValue(question.name);
        }
    }
    pageVisibilityChanged(page: IPage, newValue: boolean) {
        this.updateVisibleIndexes();
        this.onPageVisibleChanged.fire(this, { 'page': page, 'visible': newValue });
    }
    panelVisibilityChanged(panel: IPanel, newValue: boolean) {
        this.updateVisibleIndexes();
        this.onPanelVisibleChanged.fire(this, { 'panel': panel, 'visible': newValue });
    }
    questionAdded(question: IQuestion, index: number, parentPanel: any, rootPanel: any) {
        if(!question.name) question.name = this.generateNewName(this.getAllQuestions(false, true), "question");
        this.updateVisibleIndexes();
        this.addQuestionToProcessedTextValues(question);
        this.onQuestionAdded.fire(this, { 'question': question, 'name': question.name, 'index': index, 'parentPanel': parentPanel, 'rootPanel': rootPanel });
    }
    questionRemoved(question: IQuestion) {
        this.updateVisibleIndexes();
        this.onQuestionRemoved.fire(this, { 'question': question, 'name': question.name });
    }
    panelAdded(panel: IElement, index: number, parentPanel: any, rootPanel: any) {
        if(!panel.name) panel.name = this.generateNewName(this.getAllPanels(false, true), "panel");
        this.updateVisibleIndexes();
        this.onPanelAdded.fire(this, { 'panel': panel, 'name': panel.name, 'index': index, 'parentPanel': parentPanel, 'rootPanel': rootPanel });
    }
    panelRemoved(panel: IElement) {
        this.updateVisibleIndexes();
        this.onPanelRemoved.fire(this, { 'panel': panel, 'name': panel.name });
    }
    validateQuestion(name: string): SurveyError {
        if (this.onValidateQuestion.isEmpty) return null;
        var options = { name: name, value: this.getValue(name), error: null };
        this.onValidateQuestion.fire(this, options);
        return options.error ? new CustomError(options.error) : null;
    }
    processHtml(html: string): string {
        var options = { html: html };
        this.onProcessHtml.fire(this, options);
        return this.processText(options.html, true);
    }
    processText(text: string, returnDisplayValue: boolean): string {
        return this.textPreProcessor.process(text, returnDisplayValue);
    }
    processTextEx(text: string): any {
        var res = {text : this.textPreProcessor.process(text),  hasAllValuesOnLastRun: true};
        res.hasAllValuesOnLastRun = this.textPreProcessor.hasAllValuesOnLastRun;
        return res;
    }
    //ISurveyImplementor
    geSurveyData(): ISurveyData { return this; }
    getSurvey(): ISurvey { return this; }
    getTextProcessor(): ITextProcessor { return this; }
    //ISurveyTriggerOwner
    getObjects(pages: string[], questions: string[]): any[]{
        var result = [];
        Array.prototype.push.apply(result, this.getPagesByNames(pages));
        Array.prototype.push.apply(result, this.getQuestionsByNames(questions));
        return result;
    }
    setTriggerValue(name: string, value: any, isVariable: boolean) {
        if (!name) return;
        if (isVariable) {
            this.setVariable(name, value);
        } else {
            this.setValue(name, value);
        }
    }
}

JsonObject.metaData.addClass("survey", [{ name: "locale", choices: () => { return surveyLocalization.getLocales() } },
    {name: "title:text", serializationProperty: "locTitle"}, { name: "focusFirstQuestionAutomatic:boolean", default: true},
    {name: "completedHtml:html", serializationProperty: "locCompletedHtml"}, {name: "completedBeforeHtml:html", serializationProperty: "locCompletedBeforeHtml"},
    {name: "loadingHtml:html", serializationProperty: "locLoadingHtml"}, { name: "pages", className: "page", visible: false },
    { name: "questions", alternativeName: "elements", baseClassName: "question", visible: false, onGetValue: function (obj) { return null; }, onSetValue: function (obj, value, jsonConverter) { var page = obj.addNewPage(""); jsonConverter.toObject({ questions: value }, page); } },
    { name: "triggers:triggers", baseClassName: "surveytrigger", classNamePart: "trigger" },
    {name: "surveyId", visible: false}, {name: "surveyPostId", visible: false}, {name: "surveyShowDataSaving", visible: false}, "cookieName", "sendResultOnPageNext:boolean",
    { name: "showNavigationButtons:boolean", default: true }, { name: "showTitle:boolean", default: true },
    { name: "showPageTitles:boolean", default: true }, { name: "showCompletedPage:boolean", default: true },
    "showPageNumbers:boolean", { name: "showQuestionNumbers", default: "on", choices: ["on", "onPage", "off"] },
    { name: "questionTitleLocation", default: "top", choices: ["top", "bottom"] },
    { name: "questionErrorLocation", default: "top", choices: ["top", "bottom"] },
    { name: "showProgressBar", default: "off", choices: ["off", "top", "bottom"] },
    { name: "mode", default: "edit", choices: ["edit", "display"] },
    { name: "storeOthersAsComment:boolean", default: true }, "goNextPageAutomatic:boolean", 
    { name: "clearInvisibleValues", default: "none", choices: ["none", "onComplete", "onHidden"] },
    { name: "pagePrevText", serializationProperty: "locPagePrevText"},
    { name: "pageNextText", serializationProperty: "locPageNextText"},
    { name: "completeText", serializationProperty: "locCompleteText"},
    { name: "requiredText", default: "*" }, "questionStartIndex", {name: "questionTitleTemplate", serializationProperty: "locQuestionTitleTemplate"}, {name: "questionBodyTemplate", serializationProperty: "locQuestionBodyTemplate"}]);
