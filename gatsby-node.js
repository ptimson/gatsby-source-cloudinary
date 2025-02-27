const {newCloudinary, getResourceOptions} = require('./utils');
const type = `CloudinaryMedia`;

const getNodeData = (gatsby, media) => {
  return {
    ...media,
    id: gatsby.createNodeId(`cloudinary-media-${media.public_id}`),
    parent: null,
    internal: {
      type,
      content: JSON.stringify(media),
      contentDigest: gatsby.createContentDigest(media)
    }
  };
};

const addTransformations = (resource, transformation, secure)=>{
  const splitURL = secure ? resource.secure_url.split('/') : resource.url.split('/');
  splitURL.splice( 6, 0, transformation);
  const transformedURL = splitURL.join('/');
  return transformedURL;
}

const createCloudinaryNodes = (gatsby, cloudinary, options, transformations) => {
  return new Promise((resolve) => {
    fetchAllResources(cloudinary, options, (resources) => {
      createNotes(gatsby, resources, transformations);
      resolve();
    })
  });
}

const fetchAllResources = (cloudinary, options, callback) => {
  return cloudinary.api.resources(options, (error, result) => {
    const hasResources = (result && result.resources && result.resources.length);

    if (error) {
      console.error(error);
      return;
    }

    if (!hasResources) {
      console.warn('\n ~Yikes! No nodes created because no Cloudinary resources found. Try a different query?');
      return;
    }

    const { resources: currentPageResources } = result;

    if(result.next_cursor) {
      const nextPageOptions = {
        ...options,
        next_cursor: result.next_cursor
      }
      // Recursive invocation                     
      fetchAllResources(cloudinary, nextPageOptions, (nextPageResources) => {
        const combinedResources = [...currentPageResources, ...nextPageResources];
        callback(combinedResources);
      });
    } 
    else {
      callback(currentPageResources);
    }
  });
};


const createNotes = (gatsby, resources, transformations) => {
  resources.forEach(resource => {

    if (transformations) {
      resource.url = addTransformations(resource, transformations);
      resource.secure_url = addTransformations(resource, transformations, true);
    }

    const nodeData = getNodeData(gatsby, resource);
    gatsby.actions.createNode(nodeData);
  });

  console.info(`Added ${resources.length} CloudinaryMedia ${resources.length > 1 ? 'nodes' : 'node'}`);
};



exports.sourceNodes = (gatsby, options) => {
  const cloudinary = newCloudinary(options);
  const resourceOptions = getResourceOptions(options);
  const transformations = options.transformations;

  return createCloudinaryNodes(gatsby, cloudinary, resourceOptions, transformations);
};