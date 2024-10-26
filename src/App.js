/* global chrome */
import React from "react";
import "./App.css";
import { Tree, Card, Image } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { GithubOutlined, CloseCircleOutlined, ShrinkOutlined } from '@ant-design/icons';
import faviconNewtabIcon from './favicon_newtab.png';
import { useState } from "react/cjs/react.production.min";

function buildTabObj(chromeTab) {
  console.log("chromeTab: ", chromeTab)
  let tabObj = {
    id: chromeTab.id, 
    windowId: chromeTab.windowId,
    openerTabId: chromeTab.openerTabId,
    children: [],
    title: chromeTab.title,
    favIconUrl: chromeTab.favIconUrl
  }
  return tabObj;
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
      roots: [],
      focusTabId: null,
    };
  }
  componentDidMount() {
    this.initTree();
  }

  initTree() {
    let tabMap = {}
    let roots = []
    chrome.tabs.query({}, tabs =>  {
        chrome.storage.local.get(['openerTabIdMap'], result =>  {
          let openerTabIdMap = result.openerTabIdMap || {}
          
          let aliveTabIds = tabs.map(tab => tab.id)

          Object.keys(openerTabIdMap).forEach(key => {
            if (!aliveTabIds.includes(parseInt(key))) {
              delete openerTabIdMap[key]
            }
            let openerTabId = openerTabIdMap[key]
            if (!aliveTabIds.includes(openerTabId)) {
              delete openerTabIdMap[key]
            }
          })

          chrome.storage.local.set({ openerTabIdMap });

          tabs.forEach(tab => {
            let tabObj = buildTabObj(tab)
            tabObj.openerTabId = openerTabIdMap[tab.id]
            tabMap[tabObj.id] = tabObj
          })
          tabs.forEach(tab => {
            let tabObj = tabMap[tab.id]
            if(tabObj.openerTabId) {
              if (!tabMap[tabObj.openerTabId]) {
                console.log("openerTabId not found: ", tabObj.openerTabId)
              }
              tabMap[tabObj.openerTabId].children.push(tabObj)
            } else {
              roots.push(tabObj)
            }
          })
          this.setState({ roots, tabMap });
        })
      }
    )
    chrome.storage.local.get(['focusTabId'], result => {
      this.setState({ focusTabId: result.focusTabId })
    })
  }
  
  closeTabInner(tabId) {
      let currentTab = this.state.tabMap[tabId];
      let visited = [], queue = [];
      queue.push(currentTab);
      while (queue.length) {
        currentTab = queue.shift();
        visited.push(currentTab.id);
        if (currentTab.children) queue.push(...currentTab.children);
      };
      chrome.tabs.remove(visited, () => {
        this.initTree()
      }) 
  }

  closeTabOuter(tabId) {
      let currentTab = this.state.tabMap[tabId];
      let visited = [], queue = [];
      queue.push(currentTab);
      while (queue.length) {
        currentTab = queue.shift();
        visited.push(currentTab.id);
        if (currentTab.children) queue.push(...currentTab.children);
      };
      chrome.tabs.query({}, tabs => {
        let unvisited = [];
        tabs.forEach(tab => {
          if (!visited.includes(tab.id)) {
            unvisited.push(tab.id)
          }
        })
        chrome.tabs.remove(unvisited, () => {
          this.initTree()
        })
      })
  }

  render() {
    return (
      <div className="App">
        <Card
          title="TabTree++"
          extra={<a href="https://github.com/cychen2021/tab-tree-plus-plus"  target={'_blank'} rel="noreferrer"><GithubOutlined /></a>}
          style={{ width: 600 }}
        >
          {this.state.roots.length > 0 ? (
            <Tree
              fieldNames={{ title: "title", key: "id", children: "children" }}
              // showIcon
              showLine={{ showLeafIcon: false }}
              switcherIcon={<DownOutlined />}
              blockNode
              defaultExpandAll
              treeData={this.state.roots}
              titleRender = {(nodeData) => (<div style={{display: 'flex', 'justify-content': 'space-between', }}>
              <div className="tree-node-title" onClick={() => {chrome.tabs.update(nodeData.id, {active: true})}}>
                  <Image
                  width={'1rem'}
                  height={'1rem'}
                  preview={false}
                  src={nodeData.favIconUrl}
                  fallback={faviconNewtabIcon}
                />
                {nodeData.id === this.state.focusTabId ? (<u>{nodeData.title}</u>) : nodeData.title}
              </div>
              <div onClick={() => {this.closeTabInner(nodeData.id)}} style={{marginRight: "0.5rem"}}>
                <CloseCircleOutlined />
              </div>
              <div onClick={() => {this.closeTabOuter(nodeData.id)}}>
                <ShrinkOutlined />
              </div>
              
              </div>)}
            />
          ) : ( "No data" )}
        </Card>
      </div>
    );
  }
}

export default App;
