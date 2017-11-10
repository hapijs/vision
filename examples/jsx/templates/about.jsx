const React = require('react');

const Layout = require('./layout.jsx');

module.exports = class AboutPageComponent extends React.PureComponent {

    render() {

        return (
            <Layout year={this.props.year}>
                <h1>{this.props.title}</h1>
                <p>{this.props.message}</p>
            </Layout>
        );
    }
};
