import React from 'react';
import ReactDOMServer from 'react-dom/server';
import PropTypes from 'prop-types';
import _ from 'lodash';
import classNames from 'classnames';
import sanitizeHtml from 'sanitize-html';
import Remarkable from 'remarkable';
import embedjs from 'embedjs';
import Iframe from 'react-iframe'
import { jsonParse } from '../../helpers/formatter';
import sanitizeConfig from '../../vendor/SanitizeConfig';
import { imageRegex, dtubeImageRegex } from '../../helpers/regexHelpers';
import htmlReady from '../../vendor/steemitHtmlReady';
import PostFeedEmbed from './PostFeedEmbed';
import './Body.less';
import {PARLEY, PARLEY_API} from "../../../common/constants/parley";

export const remarkable = new Remarkable({
  html: true, // remarkable renders first then sanitize runs...
  breaks: true,
  linkify: false, // linkify is done locally
  typographer: false, // https://github.com/jonschlinkert/remarkable/issues/142#issuecomment-221546793
  quotes: '“”‘’',
});

const getEmbed = link => {
  const embed = embedjs.get(link, { width: '100%', height: 400, autoplay: false });

  if (_.isUndefined(embed)) {
    return {
      provider_name: '',
      thumbnail: '',
      embed: link,
    };
  }

  return embed;
};

// Should return text(html) if returnType is text
// Should return Object(React Compatible) if returnType is Object
export function getHtml(body, jsonMetadata = {}, returnType = 'Object', options = {}) {
  const parsedJsonMetadata = jsonParse(jsonMetadata) || {};
  parsedJsonMetadata.image = parsedJsonMetadata.image || [];

  let parsedBody = body.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)');

  parsedBody = parsedBody.replace(/^\s+</gm, '<');

  parsedBody.replace(imageRegex, img => {
    if (_.filter(parsedJsonMetadata.image, i => i.indexOf(img) !== -1).length === 0) {
      parsedJsonMetadata.image.push(img);
    }
  });

  const htmlReadyOptions = { mutate: true, resolveIframe: returnType === 'text' };
  parsedBody = remarkable.render(parsedBody);
  parsedBody = htmlReady(parsedBody, htmlReadyOptions).html;
  parsedBody = parsedBody.replace(dtubeImageRegex, '');
  parsedBody = sanitizeHtml(parsedBody, sanitizeConfig({}));
  if (returnType === 'text') {
    return parsedBody;
  }

  if (options.rewriteLinks) {
    parsedBody = parsedBody.replace(
      /"https?:\/\/(?:www)?steemit.com\/([A-Za-z0-9@/\-.]*)"/g,
      (match, p1) => `"/${p1}"`,
    );
  }

  parsedBody = parsedBody.replace(
    /https:\/\/ipfs\.busy\.org\/ipfs\/(\w+)/g,
    (match, p1) => `https://gateway.ipfs.io/ipfs/${p1}`,
  );

  const sections = [];

  const splittedBody = parsedBody.split('~~~ embed:');
  for (let i = 0; i < splittedBody.length; i += 1) {
    let section = splittedBody[i];

    const match = section.match(/^([A-Za-z0-9_-]+) ([A-Za-z]+) (\S+) ~~~/);
    if (match && match.length >= 4) {
      const id = match[1];
      const type = match[2];
      const link = match[3];
      const embed = getEmbed(link);
      sections.push(
        ReactDOMServer.renderToString(<PostFeedEmbed key={`embed-a-${i}`} inPost embed={embed} />),
      );
      section = section.substring(`${id} ${type} ${link} ~~~`.length);
    }
    if (section !== '') {
      sections.push(section);
    }
  }
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: sections.join('') }} />;
}

export function checkParley(metadata) {
  return (metadata.app && metadata.app.name && metadata.app.name === PARLEY)
}

class Body extends React.PureComponent {

  constructor(propos) {
    super(propos);

    this.state = {
      embedable: false,
      isParley: false,
      videoUrl: false,
      loading: true,
    }
  }

  componentWillMount() {
    const metaData = jsonParse(this.props.jsonMetadata);

    const isParley = checkParley(metaData);
    let videoUrl = false;

    if (isParley) {
      videoUrl = metaData.appdata.parley.url;

      const url = `${PARLEY_API}?url=${metaData.appdata.parley.url}&format=json`;

      fetch(url, {mode: 'cors'})
        .then(response => response.json())
        .then(data => {
          const embedable = data.embedable;
          this.setState({embedable, videoUrl, isParley, loading: false});
        }).catch((e) => {
          console.log("error", e);
          this.setState({embedable: false, videoUrl, isParley, loading: false});
        });
    } else {
      this.setState({isParley, loading: false});
    }
  }

  render() {
    const { jsonMetadata, rewriteLinks, body, full } = this.props;
    const { isParley, embedable, videoUrl, loading } = this.state;

    const metaData = jsonParse(jsonMetadata);

    if (loading)
      return <div/>;

    const options = { rewriteLinks };
    const htmlSections = getHtml(body, jsonMetadata, 'Object', options);

    return <div>
      { isParley && embedable &&
      <Iframe url={`${PARLEY_API}?url=${metaData.appdata.parley.url}&format=html`}
              width="100%"
              height="450px"
              id="myId"
              className="myClassname"
              display="initial"
              position="relative"
              allowFullScreen/>
      }

      { isParley && !embedable &&
      <a href={videoUrl}>{videoUrl}</a>
      }

      { !isParley &&
      <div className={classNames('Body', { 'Body--full': full })}>{htmlSections}</div>
      }

    </div>;
  }

}

Body.propTypes = {
  body: PropTypes.string,
  jsonMetadata: PropTypes.string,
  full: PropTypes.bool,
  rewriteLinks: PropTypes.bool,
};

Body.defaultProps = {
  body: '',
  jsonMetadata: '',
  full: false,
  rewriteLinks: false,
};

export default Body;
